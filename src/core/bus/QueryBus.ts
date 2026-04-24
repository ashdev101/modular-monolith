// ─────────────────────────────────────────────────────────────────────────────
// IQuery — marker interface every query must satisfy.
//
// correlationId: ties the read back to the originating HTTP request for tracing.
//
// The QueryBus class was removed — see CommandBus.ts for the reasoning.
// Query handlers are injected directly as use-case interfaces.
// ─────────────────────────────────────────────────────────────────────────────

export interface IQuery {
  readonly correlationId: string;
}
