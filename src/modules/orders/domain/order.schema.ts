import { z } from 'zod';

export const OrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'shipped',
  'cancelled',
  'refunded',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderRowSchema = z.object({
  id:            z.string().uuid(),
  customer_id:   z.string().uuid(),
  status:        OrderStatusSchema,
  total_cents:   z.number().int(),
  currency:      z.string(),
  discount_code: z.string().nullable(),
  discount_pct:  z.number(),
  created_at:    z.coerce.date(),
});
export type OrderRow = z.infer<typeof OrderRowSchema>;

export const OrderItemRowSchema = z.object({
  order_id:     z.string().uuid(),
  product_id:   z.string().uuid(),
  product_name: z.string(),
  quantity:     z.number().int(),
  unit_price:   z.number().int(),
});
export type OrderItemRow = z.infer<typeof OrderItemRowSchema>;
