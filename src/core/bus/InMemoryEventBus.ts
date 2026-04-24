import { v4 as uuidv4 } from 'uuid';
import type { EventEnvelope, PublishInput } from '../events/envelope';
import type { IEventBus, IEventHandler } from './IEventBus';

// ─────────────────────────────────────────────────────────────────────────────
// InMemoryEventBus — synchronous, in-process event bus.
//
// Used in:
//   • Development (no external infrastructure needed)
//   • Unit / integration tests (fast, deterministic, inspectable)
//
// Characteristics:
//   • Handlers run in the SAME process and SAME transaction scope as the
//     publisher — if the caller rolls back the DB, the event is never seen.
//   • No retries. If a handler throws, the error is logged and execution
//     continues for the other subscribers (Promise.allSettled).
//   • start() / stop() are no-ops — no connections to manage.
//
// WARNING: Not suitable for production workloads where:
//   • Events must survive process crashes  → use durable broker (Azure SB etc.)
//   • Consumers live in different services → use external broker
// ─────────────────────────────────────────────────────────────────────────────

export class InMemoryEventBus implements IEventBus {
  // Map<eventName, ordered list of handlers>
  private readonly handlers = new Map<string, IEventHandler[]>();

  // ── IEventBus.subscribe ────────────────────────────────────────────────────
  subscribe(eventName: string, handler: IEventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    this.handlers.set(eventName, [...existing, handler]);
    console.log(`[InMemoryEventBus] 📬 '${handler.constructor.name}' → '${eventName}'`);
  }

  // ── IEventBus.publish ──────────────────────────────────────────────────────
  async publish<TPayload>(input: PublishInput<TPayload>): Promise<void> {
    // The bus stamps immutable audit fields so callers can never forge them.
    const envelope: EventEnvelope<TPayload> = {
      ...input,
      eventId:    uuidv4(),
      occurredAt: new Date().toISOString(),
    };

    console.log(
      `[InMemoryEventBus] 📤 ${envelope.eventName} v${envelope.schemaVersion}` +
      ` [id=${envelope.eventId.slice(0, 8)}…]` +
      ` [corr=${envelope.correlationId.slice(0, 8)}…]`,
    );

    const subscribers = this.handlers.get(envelope.eventName) ?? [];

    if (subscribers.length === 0) {
      console.warn(`[InMemoryEventBus] ⚠️  No subscribers for '${envelope.eventName}'`);
      return;
    }

    // Run ALL handlers in parallel — they are independent by design.
    // allSettled means one failing handler never blocks the others.
    const results = await Promise.allSettled(
      subscribers.map(h => h.handle(envelope)),
    );

    for (const r of results) {
      if (r.status === 'rejected') {
        // Production equivalent: push to dead-letter queue and alert on-call.
        console.error('[InMemoryEventBus] ❌ Handler threw:', r.reason);
      }
    }
  }

  // ── IEventBus.start / stop — no-ops for in-memory transport ───────────────
  async start(): Promise<void> {
    console.log('[InMemoryEventBus] ✅ Started (in-process, no external connections)');
  }

  async stop(): Promise<void> {
    console.log('[InMemoryEventBus] 🛑 Stopped');
  }
}
