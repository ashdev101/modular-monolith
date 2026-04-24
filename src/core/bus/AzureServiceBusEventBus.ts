import { v4 as uuidv4 } from 'uuid';
import {
  ServiceBusClient,
  ServiceBusSender,
  ServiceBusReceiver,
  ServiceBusMessage,
  ServiceBusReceivedMessage,
  ProcessErrorArgs,
} from '@azure/service-bus';
import { ServiceBusAdministrationClient } from '@azure/service-bus';
import type { EventEnvelope, PublishInput } from '../events/envelope';
import type { IEventBus, IEventHandler } from './IEventBus';

// ─────────────────────────────────────────────────────────────────────────────
// AzureServiceBusEventBus — production-grade event transport.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  MENTAL MODEL: Topic / Subscription pattern (fan-out publish-subscribe) │
// │                                                                         │
// │  Publisher ──────────────▶ Topic: "customers.registered"                │
// │                                 │                                       │
// │                     ┌──────────┼──────────┐                            │
// │                     ▼          ▼          ▼                            │
// │           Sub:               Sub:               Sub:                   │
// │      "OnCustomerRegistered"  "EmailHandler"  "AuditHandler"            │
// │            │                    │                    │                  │
// │         handler 1           handler 2           handler 3              │
// │                                                                         │
// │  Each subscription is an INDEPENDENT queue. All three handlers receive  │
// │  EVERY message published to the topic — this is true fan-out.           │
// └─────────────────────────────────────────────────────────────────────────┘
//
// Lifecycle:
//   subscribe() — call at module init, BEFORE start()
//               — registers intent only; no network calls yet
//   start()     — creates topics & subscriptions if missing (idempotent)
//               — opens a ServiceBusReceiver per (eventName, handler) pair
//               — starts message pump (subscribe callback model)
//   stop()      — closes all receivers, then all senders, then the client
//               — Azure SDK drains in-flight messages before closing
//
// Guarantees:
//   • At-least-once delivery — Azure retries on handler failure up to
//     maxDeliveryCount (default 10), then dead-letters the message.
//   • Ordered within a session (we don't use sessions here; add if needed).
//   • Message lock renewed automatically by the SDK during long processing.
// ─────────────────────────────────────────────────────────────────────────────

// Internal shape stored at subscribe() time — resolved at start()
interface Subscription {
  eventName:        string;
  subscriptionName: string;       // unique name for the Azure SB subscription
  handler:          IEventHandler;
}

export class AzureServiceBusEventBus implements IEventBus {
  private readonly client:     ServiceBusClient;
  private readonly adminClient: ServiceBusAdministrationClient;

  // Populated by subscribe(); read by start()
  private readonly pendingSubscriptions: Subscription[] = [];

  // Populated by start(); closed by stop()
  private readonly activeSenders:   Map<string, ServiceBusSender>   = new Map();
  private readonly activeReceivers: ServiceBusReceiver[]             = [];

  private started = false;

  constructor(connectionString: string) {
    // ServiceBusClient — data plane: send / receive messages
    this.client = new ServiceBusClient(connectionString);

    // ServiceBusAdministrationClient — management plane: create topics / subs
    // Uses the same connection string; the SDK extracts the endpoint & key.
    this.adminClient = new ServiceBusAdministrationClient(connectionString);
  }

  // ── IEventBus.subscribe ────────────────────────────────────────────────────
  // Called synchronously at module init (no await).
  // Records intent; no network calls here.
  subscribe(eventName: string, handler: IEventHandler): void {
    if (this.started) {
      throw new Error(
        `[AzureServiceBusEventBus] subscribe() called after start(). ` +
        `Register all handlers before calling start().`,
      );
    }

    // Use the handler's class name as the subscription name so each
    // consumer gets its own independent queue under the topic.
    // If two handlers share a name (unlikely) append an index.
    const baseName   = handler.constructor.name || 'handler';
    const existing   = this.pendingSubscriptions.filter(s => s.eventName === eventName);
    const hasSameName = existing.some(s => s.subscriptionName === baseName);
    const subscriptionName = hasSameName ? `${baseName}_${existing.length}` : baseName;

    this.pendingSubscriptions.push({ eventName, subscriptionName, handler });

    console.log(
      `[AzureServiceBusEventBus] 📝 Registered '${subscriptionName}' → topic '${eventName}'`,
    );
  }

  // ── IEventBus.publish ──────────────────────────────────────────────────────
  async publish<TPayload>(input: PublishInput<TPayload>): Promise<void> {
    const envelope: EventEnvelope<TPayload> = {
      ...input,
      eventId:    uuidv4(),
      occurredAt: new Date().toISOString(),
    };

    console.log(
      `[AzureServiceBusEventBus] 📤 ${envelope.eventName} v${envelope.schemaVersion}` +
      ` [id=${envelope.eventId.slice(0, 8)}…]`,
    );

    // Lazily create a sender for this topic and cache it.
    // Senders are lightweight and safe to reuse across calls.
    let sender = this.activeSenders.get(envelope.eventName);
    if (!sender) {
      sender = this.client.createSender(envelope.eventName);
      this.activeSenders.set(envelope.eventName, sender);
    }

    // Map our EventEnvelope onto a ServiceBusMessage.
    //
    //   body            → the serialised payload (what consumers decode)
    //   messageId       → eventId — used by Azure for deduplication if enabled
    //   correlationId   → forwarded to Azure; visible in metrics / traces
    //   subject         → eventName — human-readable label in Azure Portal
    //   applicationProperties → schemaVersion + causationId for routing rules
    const message: ServiceBusMessage = {
      body:          JSON.stringify(envelope),  // full envelope, not just payload
      messageId:     envelope.eventId,
      correlationId: envelope.correlationId,
      subject:       envelope.eventName,
      applicationProperties: {
        schemaVersion: envelope.schemaVersion,
        causationId:   envelope.causationId,
        eventName:     envelope.eventName,
      },
    };

    await sender.sendMessages(message);
  }

  // ── IEventBus.start ────────────────────────────────────────────────────────
  // 1. Create Azure SB topics (one per unique eventName) — idempotent.
  // 2. Create Azure SB subscriptions (one per handler)   — idempotent.
  // 3. Open a receiver per subscription and start the message pump.
  async start(): Promise<void> {
    if (this.started) return;   // idempotent

    console.log('[AzureServiceBusEventBus] 🚀 Starting...');

    // De-duplicate: find unique topic names across all subscriptions
    const uniqueTopics = [...new Set(this.pendingSubscriptions.map(s => s.eventName))];

    // ── Step 1: ensure topics exist ──────────────────────────────────────────
    for (const topicName of uniqueTopics) {
      const exists = await this.adminClient.topicExists(topicName);
      if (!exists) {
        await this.adminClient.createTopic(topicName, {
          // duplicateDetectionHistoryTimeWindow: 'PT10M'  // enable to deduplicate
          // maxSizeInMegabytes: 1024,
          // defaultMessageTimeToLive: 'P14D',
        });
        console.log(`[AzureServiceBusEventBus]   ✔ Created topic '${topicName}'`);
      } else {
        console.log(`[AzureServiceBusEventBus]   ○ Topic '${topicName}' already exists`);
      }
    }

    // ── Step 2: ensure subscriptions exist, open receivers ──────────────────
    for (const sub of this.pendingSubscriptions) {
      // Create the Azure SB subscription if it doesn't exist yet.
      const exists = await this.adminClient.subscriptionExists(
        sub.eventName,
        sub.subscriptionName,
      );
      if (!exists) {
        await this.adminClient.createSubscription(sub.eventName, sub.subscriptionName, {
          // deadLetteringOnMessageExpiration: true,
          // maxDeliveryCount: 10,               // default; after 10 failures → DLQ
          // lockDuration: 'PT1M',               // message lock time (max 5 min)
        });
        console.log(
          `[AzureServiceBusEventBus]   ✔ Created subscription ` +
          `'${sub.eventName}/${sub.subscriptionName}'`,
        );
      }

      // Open a receive-and-delete or peek-lock receiver.
      // We use peekLock (default) so that if the handler crashes the message
      // is automatically unlocked and retried by Azure.
      const receiver = this.client.createReceiver(sub.eventName, sub.subscriptionName, {
        receiveMode: 'peekLock',   // safe: message stays on queue until completeMessage()
      });

      // ── Message pump ──────────────────────────────────────────────────────
      // subscribe() starts a continuous receive loop managed by the Azure SDK.
      // The SDK fetches messages in batches, renews locks automatically, and
      // calls our callbacks on the same event-loop tick.
      receiver.subscribe({
        processMessage: (sbMessage: ServiceBusReceivedMessage) =>
          this.processMessage(sbMessage, sub.handler, receiver),

        processError: (args: ProcessErrorArgs) =>
          this.processError(args, sub.eventName, sub.subscriptionName),
      });

      this.activeReceivers.push(receiver);

      console.log(
        `[AzureServiceBusEventBus]   ▶ Receiver started for ` +
        `'${sub.eventName}/${sub.subscriptionName}'`,
      );
    }

    this.started = true;
    console.log('[AzureServiceBusEventBus] ✅ All receivers running');
  }

  // ── IEventBus.stop ─────────────────────────────────────────────────────────
  // Graceful shutdown — Azure SDK waits for in-flight processMessage() calls
  // to complete before closing the connection.
  async stop(): Promise<void> {
    console.log('[AzureServiceBusEventBus] 🛑 Shutting down...');

    // Close receivers first — stop accepting new messages
    await Promise.all(this.activeReceivers.map(r => r.close()));

    // Close senders
    await Promise.all([...this.activeSenders.values()].map(s => s.close()));

    // Close the underlying AMQP connection
    await this.client.close();

    console.log('[AzureServiceBusEventBus] ✅ Shutdown complete');
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async processMessage(
    sbMessage: ServiceBusReceivedMessage,
    handler: IEventHandler,
    receiver: ServiceBusReceiver,
  ): Promise<void> {
    // Azure SB body is whatever we sent — we always send JSON strings.
    let envelope: EventEnvelope;
    try {
      const raw = typeof sbMessage.body === 'string'
        ? sbMessage.body
        : JSON.stringify(sbMessage.body);   // binary / Buffer fallback
      envelope = JSON.parse(raw) as EventEnvelope;
    } catch (parseErr) {
      console.error('[AzureServiceBusEventBus] ❌ Failed to parse message body:', parseErr);
      // Dead-letter malformed messages immediately — retrying won't help.
      await receiver.deadLetterMessage(sbMessage, {
        deadLetterReason: 'ParseError',
        deadLetterErrorDescription: String(parseErr),
      });
      return;
    }

    try {
      await handler.handle(envelope);

      // Acknowledge: tell Azure the message was processed successfully.
      // Azure removes it from the subscription queue.
      await receiver.completeMessage(sbMessage);

      console.log(
        `[AzureServiceBusEventBus] ✔ Processed '${envelope.eventName}' ` +
        `[id=${envelope.eventId?.slice(0, 8)}…] by '${handler.constructor.name}'`,
      );
    } catch (handlerErr) {
      console.error(
        `[AzureServiceBusEventBus] ❌ Handler '${handler.constructor.name}' ` +
        `threw for '${envelope.eventName}':`,
        handlerErr,
      );

      // Do NOT complete. Azure will unlock the message after the lock duration
      // and retry up to maxDeliveryCount times, then dead-letter automatically.
      // If you want immediate abandon (skip remaining lock time), call:
      //   await receiver.abandonMessage(sbMessage);
    }
  }

  private processError(
    args: ProcessErrorArgs,
    topicName: string,
    subscriptionName: string,
  ): Promise<void> {
    // Transport-level errors (AMQP disconnect, auth failure, throttling).
    // The SDK will attempt reconnection automatically.
    console.error(
      `[AzureServiceBusEventBus] ⚠️  Transport error on ` +
      `'${topicName}/${subscriptionName}' [source=${args.errorSource}]:`,
      args.error,
    );
    return Promise.resolve();
  }
}
