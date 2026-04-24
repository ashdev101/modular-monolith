import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Customers domain — event payload schemas.
// ─────────────────────────────────────────────────────────────────────────────

// ── customers.customer.registered ────────────────────────────────────────
export const CustomerRegisteredSchema = z.object({
  customerId: z.string().uuid(),
  name:       z.string().min(1),
  email:      z.string().email(),
  isVip:      z.boolean(),
});
export type CustomerRegistered = z.infer<typeof CustomerRegisteredSchema>;

// ── customers.customer.vip_granted ───────────────────────────────────────
export const CustomerVipGrantedSchema = z.object({
  customerId:   z.string().uuid(),
  name:         z.string(),
  vipGrantedAt: z.string().datetime(),
});
export type CustomerVipGranted = z.infer<typeof CustomerVipGrantedSchema>;

// ── customers.customer.vip_revoked (future) ──────────────────────────────
export const CustomerVipRevokedSchema = z.object({
  customerId:   z.string().uuid(),
  vipRevokedAt: z.string().datetime(),
  reason:       z.string().optional(),
});
export type CustomerVipRevoked = z.infer<typeof CustomerVipRevokedSchema>;
