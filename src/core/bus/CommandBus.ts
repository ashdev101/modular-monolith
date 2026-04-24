// ─────────────────────────────────────────────────────────────────────────────
// ICommand — marker interface every command must satisfy.
//
// correlationId: ties this command back to the originating HTTP request.
//                Pass it through to every event the handler publishes so you
//                can trace a full request chain in logs: HTTP → command → events.
//
// causationId:   the specific thing that directly caused this command
//                (usually the same as correlationId at the HTTP entry point).
//
// The CommandBus class was removed — it was a Map.get() wrapper with no
// middleware pipeline. Handlers are now injected directly as use-case
// interfaces. Phase 3 microservices swap: replace the local handler with an
// HTTP implementation of the same interface. No controller changes needed.
// ─────────────────────────────────────────────────────────────────────────────

export interface ICommand {
  readonly correlationId: string;
  readonly causationId:   string;
}
