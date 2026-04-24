import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// CustomerDTO — Zod schema is the single source of truth.
//
// The TypeScript type is derived from the schema — not declared separately.
// This means the runtime shape and the compile-time type can never drift apart.
//
// Before: TypeScript interface (compile-time only — "banana" is a valid string)
// After:  Zod schema (runtime + compile-time — "banana" fails .email() check)
// ─────────────────────────────────────────────────────────────────────────────

export const CustomerDTOSchema = z.object({
  id:        z.string().uuid(),
  name:      z.string().min(2),
  email:     z.string().email(),
  isVip:     z.boolean(),
  createdAt: z.string().datetime(),
});

export type CustomerDTO = z.infer<typeof CustomerDTOSchema>;
