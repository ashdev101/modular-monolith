import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Discounts domain — event payload schemas.
// ─────────────────────────────────────────────────────────────────────────────

// ── discounts.discount.applied ───────────────────────────────────────────
export const DiscountAppliedSchema = z.object({
  orderId:       z.string().uuid(),
  customerId:    z.string().uuid(),
  code:          z.string(),
  percentage:    z.number().min(0).max(100),
  savingsAmount: z.number().int().nonnegative(),  // cents
});
export type DiscountApplied = z.infer<typeof DiscountAppliedSchema>;

// ── discounts.discount.expired ───────────────────────────────────────────
export const DiscountExpiredSchema = z.object({
  code:      z.string(),
  expiredAt: z.string().datetime(),
});
export type DiscountExpired = z.infer<typeof DiscountExpiredSchema>;

// ── discounts.discount.depleted ──────────────────────────────────────────
// Max usage count reached — code can no longer be applied.
export const DiscountDepletedSchema = z.object({
  code:      z.string(),
  maxUsage:  z.number().int().positive(),
  usedAt:    z.string().datetime(),
});
export type DiscountDepleted = z.infer<typeof DiscountDepletedSchema>;
