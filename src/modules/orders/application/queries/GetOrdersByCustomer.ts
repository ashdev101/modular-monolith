import { sql } from 'slonik';
import { z } from 'zod';
import type { IGetOrdersByCustomerUseCase, GetOrdersByCustomerQuery, OrderSummaryView } from '../ports/queries/IGetOrdersByCustomerUseCase';
import type { DatabasePool } from '../../../../core/database/pool';

const OrderSummarySchema = z.object({
  id:           z.string().uuid(),
  status:       z.string(),
  total_cents:  z.number(),
  currency:     z.string(),
  discount_pct: z.number(),
  created_at:   z.string(),
  item_count:   z.number(),
});

export class GetOrdersByCustomerHandler implements IGetOrdersByCustomerUseCase {
  constructor(private readonly pool: DatabasePool) {}

  async execute(query: GetOrdersByCustomerQuery): Promise<OrderSummaryView[]> {
    const rows = await this.pool.any(sql.type(OrderSummarySchema)`
      SELECT
        o.id,
        o.status,
        o.total_cents,
        o.currency,
        o.discount_pct,
        o.created_at::text,
        COUNT(oi.order_id)::int AS item_count
      FROM  orders.orders      o
      LEFT  JOIN orders.order_items oi ON oi.order_id = o.id
      WHERE o.customer_id = ${query.customerId}
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);

    return rows.map(r => ({
      orderId:     r.id,
      status:      r.status,
      totalCents:  r.total_cents,
      currency:    r.currency,
      discountPct: r.discount_pct,
      createdAt:   r.created_at,
      itemCount:   r.item_count,
    }));
  }
}
