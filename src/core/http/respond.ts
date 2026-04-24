import type { Response } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// respond — single source of truth for all HTTP response shapes.
//
// Success shape:  { success: true,  data: T }
// Error shape:    { success: false, error: string, requestId: string }
//
// Both shapes are defined here so changing the envelope format is a one-file edit.
// ─────────────────────────────────────────────────────────────────────────────

export const respond = {
  ok<T>(res: Response, data: T): void {
    res.status(200).json({ success: true, data });
  },

  created<T>(res: Response, data: T): void {
    res.status(201).json({ success: true, data });
  },

  noContent(res: Response): void {
    res.status(204).send();
  },

  fail(res: Response, status: number, message: string, requestId: string): void {
    res.status(status).json({ success: false, error: message, requestId });
  },
};
