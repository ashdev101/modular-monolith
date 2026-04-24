import { sql } from 'slonik';
import { z } from 'zod';
import type { IGetOrderDetailUseCase, GetOrderDetailQuery, OrderDetailView } from '../ports/queries/IGetOrderDetailUseCase';
import type { DatabasePool } from '../../../../core/database/pool';
import { NotFoundError } from '../../../../core/errors';

// ─────────────────────────────────────────────────────────────────────────────
// Cross-schema JOIN — one SQL query, one DB round trip, strong consistency.
// Local schema describes this specific JOIN result, not a reusable entity shape.
// ─────────────────────────────────────────────────────────────────────────────

const OrderDetailSchema = z.object({
  order_id:        z.string().uuid(),
  status:          z.string(),
  total_cents:     z.number(),
  currency:        z.string(),
  discount_code:   z.string().nullable(),
  discount_pct:    z.number(),
  created_at:      z.string(),
  customer_name:   z.string(),
  customer_email:  z.string(),
  customer_is_vip: z.boolean(),
  product_id:      z.string().uuid(),
  product_name:    z.string(),
  quantity:        z.number(),
  unit_price:      z.number(),
  stock_remaining: z.number(),
});

export class GetOrderDetailHandler implements IGetOrderDetailUseCase {
  constructor(private readonly pool: DatabasePool) {}

  async execute(query: GetOrderDetailQuery): Promise<OrderDetailView> {
    const row = await this.pool.maybeOne(sql.type(OrderDetailSchema)`
      SELECT
        o.id               AS order_id,
        o.status,
        o.total_cents,
        o.currency,
        o.discount_code,
        o.discount_pct,
        o.created_at::text,

        c.name             AS customer_name,
        c.email            AS customer_email,
        c.is_vip           AS customer_is_vip,

        oi.product_id,
        oi.product_name,
        oi.quantity,
        oi.unit_price,

        p.quantity         AS stock_remaining

      FROM   orders.orders       o
      JOIN   orders.order_items  oi ON oi.order_id  = o.id
      JOIN   customers.customers c  ON c.id          = o.customer_id
      JOIN   inventory.products  p  ON p.id          = oi.product_id
      WHERE  o.id = ${query.orderId}
    `);

    if (!row) throw new NotFoundError('Order', query.orderId);

    return {
      orderId:        row.order_id,
      status:         row.status,
      totalCents:     row.total_cents,
      currency:       row.currency,
      discountCode:   row.discount_code,
      discountPct:    row.discount_pct,
      createdAt:      row.created_at,
      customerName:   row.customer_name,
      customerEmail:  row.customer_email,
      customerIsVip:  row.customer_is_vip,
      productId:      row.product_id,
      productName:    row.product_name,
      quantity:       row.quantity,
      unitPriceCents: row.unit_price,
      stockRemaining: row.stock_remaining,
    };
  }
}
