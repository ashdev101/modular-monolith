import { v4 as uuidv4 } from 'uuid';
import { sql, type FragmentSqlToken } from 'slonik';
import { type ZodType } from 'zod';
import type { DatabasePool } from '../../../../core/database/pool';
import { BaseRepository } from '../../../../core/repository/BaseRepository';
import { Order } from '../../domain/Order';
import { OrderItem } from '../../domain/OrderItem';
import { Money } from '../../domain/Money';
import { OrderRowSchema, OrderItemRowSchema } from '../../domain/order.schema';
import type { OrderRow, OrderItemRow } from '../../domain/order.schema';

// ─────────────────────────────────────────────────────────────────────────────
// OrderRepository — touches ONLY orders.* schema.
//
// findByCustomerId batches item fetching — no N+1:
//   1 query for order rows  +  1 query for ALL their items  =  2 queries total
//
// toDomain() is intentionally unreachable — Order requires items to reconstitute
// so findById and findAll are both overridden and call toOrder() directly.
// ─────────────────────────────────────────────────────────────────────────────

const ORDER_COLS = sql.fragment`
  id, customer_id, status, total_cents, currency, discount_code, discount_pct, created_at
`;
const ITEM_COLS = sql.fragment`
  order_id, product_id, product_name, quantity, unit_price
`;

export class OrderRepository extends BaseRepository<OrderRow, Order> {
  protected readonly schema: ZodType<OrderRow> = OrderRowSchema;
  protected readonly table = 'orders.orders';
  protected readonly entityName = 'Order';
  protected readonly selectCols: FragmentSqlToken = ORDER_COLS;

  constructor(pool: DatabasePool) {
    super(pool);
  }

  protected toDomain(_row: OrderRow): Order {
    throw new Error('OrderRepository.toDomain is unreachable — use findById or findByCustomerId');
  }

  async save(order: Order): Promise<void> {
    await this.pool.transaction(async (tx) => {
      await tx.query(sql.unsafe`
        INSERT INTO orders.orders
          (id, customer_id, status, total_cents, currency, discount_code, discount_pct, created_at, updated_at)
        VALUES (
          ${order.id},
          ${order.customerId},
          ${order.status},
          ${order.total.amount},
          ${order.currency},
          ${order.discountCode},
          ${order.discountPct},
          ${order.createdAt.toISOString()},
          ${this.now()}
        )
      `);

      for (const item of order.items) {
        await tx.query(sql.unsafe`
          INSERT INTO orders.order_items
            (id, order_id, product_id, product_name, quantity, unit_price)
          VALUES (
            ${uuidv4()},
            ${order.id},
            ${item.productId},
            ${item.productName},
            ${item.quantity},
            ${item.unitPrice.amount}
          )
        `);
      }
    });
  }

  async update(order: Order): Promise<void> {
    await this.pool.query(sql.unsafe`
      UPDATE orders.orders
      SET status = ${order.status}, updated_at = ${this.now()}
      WHERE id = ${order.id}
    `);
  }

  override async findById(id: string): Promise<Order | null> {
    const row = await this.pool.maybeOne(sql.type(OrderRowSchema)`
      SELECT ${ORDER_COLS} FROM orders.orders WHERE id = ${id}
    `);
    if (!row) return null;

    const items = await this.pool.any(sql.type(OrderItemRowSchema)`
      SELECT ${ITEM_COLS} FROM orders.order_items WHERE order_id = ${id}
    `);

    return this.toOrder(row, items);
  }

  // findByIdOrThrow is inherited from BaseRepository — calls our overridden findById above.

  override async findAll(): Promise<Order[]> {
    throw new Error('OrderRepository.findAll() is not supported — use findByCustomerId()');
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const rows = await this.pool.any(sql.type(OrderRowSchema)`
      SELECT ${ORDER_COLS} FROM orders.orders
      WHERE customer_id = ${customerId}
      ORDER BY created_at DESC
    `);

    if (rows.length === 0) return [];

    const orderIds = rows.map(r => r.id);
    const allItems = await this.pool.any(sql.type(OrderItemRowSchema)`
      SELECT ${ITEM_COLS} FROM orders.order_items
      WHERE order_id = ANY(${sql.array(orderIds, 'uuid')})
    `);

    const itemsByOrder = new Map<string, OrderItemRow[]>();
    for (const item of allItems) {
      const list = itemsByOrder.get(item.order_id) ?? [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    }

    return rows.map(row => this.toOrder(row, itemsByOrder.get(row.id) ?? []));
  }

  private toOrder(row: OrderRow, items: readonly OrderItemRow[]): Order {
    const orderItems = items.map(i =>
      new OrderItem(i.product_id, i.product_name, i.quantity, Money.ofCents(i.unit_price, row.currency))
    );
    return Order.reconstitute(row, orderItems, Money.ofCents(row.total_cents, row.currency));
  }
}
