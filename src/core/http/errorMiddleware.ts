import type { Request, Response, NextFunction } from 'express';
import {
  DomainError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../errors';
import { respond } from './respond';

// ─────────────────────────────────────────────────────────────────────────────
// Global Express error middleware — the single source of truth for
// error → HTTP status mapping. Must be registered LAST in main.ts
// (after all route registrations) and must have exactly 4 arguments.
//
// Error → status mapping (most-specific first — subclasses before base):
//   NotFoundError   → 404
//   ValidationError → 400
//   ConflictError   → 409
//   DomainError     → 422  (catches InsufficientStockError, InvalidDiscountError, OrderStateError, etc.)
//   unknown         → 500  (programming error — logged server-side, never exposed to client)
//
// requestId is included in every error response body so clients can report
// it to ops for correlation with server-side logs.
// ─────────────────────────────────────────────────────────────────────────────

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // next must be declared even if unused — Express uses function.length to
  // identify this as an error handler (4 args vs 3 for regular middleware).
  _next: NextFunction,
): void {
  if (res.headersSent) return;

  const requestId = req.requestId;

  if (err instanceof NotFoundError)   { respond.fail(res, 404, err.message, requestId); return; }
  if (err instanceof ValidationError) { respond.fail(res, 400, err.message, requestId); return; }
  if (err instanceof ConflictError)   { respond.fail(res, 409, err.message, requestId); return; }
  if (err instanceof DomainError)     { respond.fail(res, 422, err.message, requestId); return; }

  // Unknown error — likely a programming bug. Log full details server-side,
  // never expose internals to the client.
  console.error(`[ERROR] ${req.method} ${req.path} requestId=${requestId}`, err);
  respond.fail(res, 500, 'Internal server error', requestId);
}
