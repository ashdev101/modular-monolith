import type { EventEnvelope, PublishInput } from '../events/envelope';

// ─────────────────────────────────────────────────────────────────────────────
// IEventBus — the contract every transport must satisfy.
//
// Today:   InMemoryEventBus  (development, tests)
// Day 2:   AzureServiceBusEventBus (production)
// Day N:   AwsSqsEventBus / KafkaEventBus / RabbitMqEventBus
//
// The rest of the application — handlers, modules, controllers — only ever
// imports this interface. Swapping the transport is a one-line change in
// createEventBus(). Nothing else changes.
//
// Lifecycle:
//   subscribe() → register intent (always synchronous, called at module init)
//   start()     → open connections / start consumers (called once at app boot)
//   stop()      → graceful shutdown (called on SIGTERM)
// ─────────────────────────────────────────────────────────────────────────────

export interface IEventHandler<TPayload = unknown> {
  handle(envelope: EventEnvelope<TPayload>): Promise<void>;
}

export interface IEventBus {
  /**
   * Publish an event to all subscribers.
   * The bus stamps eventId and occurredAt — callers never forge them.
   */
  publish<TPayload>(input: PublishInput<TPayload>): Promise<void>;

  /**
   * Register a handler for an event name.
   * Must be called BEFORE start() — typically inside module.register().
   */
  subscribe(eventName: string, handler: IEventHandler): void;

  /**
   * Open connections, create topics/queues/subscriptions, start consumers.
   * Safe to call multiple times (idempotent).
   */
  start(): Promise<void>;

  /**
   * Drain in-flight messages, close connections.
   * Call on SIGTERM to avoid message loss.
   */
  stop(): Promise<void>;
}
