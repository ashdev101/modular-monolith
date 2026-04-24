import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Order domain — event payload schemas.
//
// These are the ONLY definitions of what the payload contains.
// Import these types everywhere instead of defining inline or in command files.
//
// Versioned events (orders.created) live in ../versions/ and are re-exported
// here so consumers always import from one place.
// ─────────────────────────────────────────────────────────────────────────────

// Re-export versioned schemas so consumers don't need to know about ../versions/
export { OrderCreatedV2Schema as OrderCreatedSchema, OrderCreatedV2 as OrderCreated }
  from '../versions/orders.created.v2.schema';
export { OrderCreatedV1Schema, OrderCreatedV1 }
  from '../versions/orders.created.v1.schema';
export { upcastV1toV2 as upcastOrderCreatedV1toV2 }
  from '../versions/orders.created.v2.schema';

// ── orders.order.cancelled ────────────────────────────────────────────────
export const OrderCancelledSchema = z.object({
  orderId:    z.string().uuid(),
  customerId: z.string().uuid(),
  productId:  z.string().uuid(),
  quantity:   z.number().int().positive(),
  reason:     z.string().min(1),
});
export type OrderCancelled = z.infer<typeof OrderCancelledSchema>;

// ── orders.order.shipped (future) ─────────────────────────────────────────
export const OrderShippedSchema = z.object({
  orderId:        z.string().uuid(),
  customerId:     z.string().uuid(),
  trackingNumber: z.string(),
  carrier:        z.string(),
  shippedAt:      z.string().datetime(),
});
export type OrderShipped = z.infer<typeof OrderShippedSchema>;

// ── orders.order.refunded (future) ────────────────────────────────────────
export const OrderRefundedSchema = z.object({
  orderId:      z.string().uuid(),
  customerId:   z.string().uuid(),
  refundAmount: z.number().int().nonnegative(),
  reason:       z.string(),
  refundedAt:   z.string().datetime(),
});
export type OrderRefunded = z.infer<typeof OrderRefundedSchema>;
