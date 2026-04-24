import { z } from 'zod';
import { ValidationError } from '../errors';

// ─────────────────────────────────────────────────────────────────────────────
// parseOrThrow — the ONLY bridge between Zod and our error vocabulary.
//
// Why not use schema.parse() directly?
//   schema.parse() throws ZodError, which is not in our error hierarchy.
//   The controller's handleError() maps ValidationError → HTTP 400.
//   A raw ZodError would fall through to the 500 handler.
//
// Usage:
//   const body = parseOrThrow(CreateOrderBodySchema, req.body);
//   // body is fully typed; a bad payload throws ValidationError → 400
// ─────────────────────────────────────────────────────────────────────────────

export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const prefix  = context ? `[${context}] ` : '';
    const message = result.error.issues
      .map(i => {
        const path = i.path.length > 0 ? `${i.path.join('.')}: ` : '';
        return `${path}${i.message}`;
      })
      .join('; ');

    throw new ValidationError(`${prefix}${message}`);
  }

  return result.data;
}
