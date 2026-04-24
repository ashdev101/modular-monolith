// ─────────────────────────────────────────────────────────────────────────────
// EventEnvelope — the standard wrapper for every event in the system.
//
// Why a wrapper and not just the payload?
//   - eventId:       deduplication — consumers can use this to detect replays
//   - schemaVersion: enables v1/v2 coexistence without breaking consumers
//   - correlationId: tie every event to the originating HTTP request
//   - causationId:   which command (or event) produced this event
//   - occurredAt:    immutable timestamp — set once by the publisher
//
// When we move to Kafka/SQS, the envelope maps directly to message headers.
// Consumers never change — only the transport swaps.
// ─────────────────────────────────────────────────────────────────────────────

export interface EventEnvelope<TPayload = unknown> {
  /** UUID v4 — for idempotency checks in consumers */
  eventId: string;

  /** From Events registry — never a hardcoded string */
  eventName: string;

  /** Increments only on breaking changes — never removes fields */
  schemaVersion: number;

  /** ISO 8601 — set by publisher, never mutated */
  occurredAt: string;

  /** Ties back to the originating HTTP request or upstream event */
  correlationId: string;

  /** The command or event that directly caused this event to be published */
  causationId: string;

  /** The actual event data — typed per event version */
  payload: TPayload;
}

// Builder helper so handlers don't have to fill every field manually.
// The bus fills eventId and occurredAt on publish.
export type PublishInput<TPayload> = Omit<EventEnvelope<TPayload>, 'eventId' | 'occurredAt'>;
