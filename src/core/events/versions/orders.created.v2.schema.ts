import { z } from 'zod';
import { OrderCreatedV1Schema } from './orders.created.v1.schema';
import type { OrderCreatedV1 } from './orders.created.v1.schema';

// V2 extends V1 structurally — not just by comment.
// If a V1 field is removed from OrderCreatedV1Schema, this line fails at compile
// time. The schema enforces backward compatibility automatically.

export const OrderCreatedV2Schema = OrderCreatedV1Schema.extend({
  currency:    z.string().length(3, 'currency must be a 3-char ISO 4217 code'),
  discountPct: z.number().min(0).max(100),
});

export type OrderCreatedV2 = z.infer<typeof OrderCreatedV2Schema>;

export function upcastV1toV2(v1: OrderCreatedV1): OrderCreatedV2 {
  return { ...v1, currency: 'USD', discountPct: 0 };
}
