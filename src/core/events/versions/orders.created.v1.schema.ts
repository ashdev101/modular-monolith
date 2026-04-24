import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// OrderCreatedV1 Zod schema — sibling to the interface in .v1.ts
//
// Used today for: type derivation (z.infer replaces the manual interface)
// Used in Phase 3: runtime parse in OnOrderCreated.handle() when bus is Kafka
//
// The interface in orders.created.v1.ts is kept as a re-export for any
// consumer that imports the type directly — backward-compatible transition.
// ─────────────────────────────────────────────────────────────────────────────

export const OrderCreatedV1Schema = z.object({
  orderId:    z.string().uuid(),
  customerId: z.string().uuid(),
  productId:  z.string().uuid(),
  quantity:   z.number().int().positive(),
  total:      z.number().int().nonnegative(),
});

export type OrderCreatedV1 = z.infer<typeof OrderCreatedV1Schema>;
