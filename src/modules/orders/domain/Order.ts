import { v4 as uuidv4 } from 'uuid';
import { DomainError, OrderStateError } from '../../../core/errors';
import type { OrderItem } from './OrderItem';
import type { Money } from './Money';
import type { OrderRow, OrderStatus } from './order.schema';

// ─────────────────────────────────────────────────────────────────────────────
// Order — Aggregate Root.
//
// OrderStatus is defined once in order.schema.ts (canonical Zod enum) and
// imported here — the DB row schema and this domain class share the same type.
//
// reconstitute() takes an OrderRow (from order.schema.ts) plus pre-built
// items and total that the repository constructs before calling it.
// ─────────────────────────────────────────────────────────────────────────────

export type { OrderStatus };

export class Order {
  private _status: OrderStatus;

  private constructor(
    public readonly id:           string,
    public readonly customerId:   string,
    public readonly items:        OrderItem[],
    public readonly total:        Money,
    public readonly discountCode: string | null,
    public readonly discountPct:  number,
    public readonly currency:     string,
    public readonly createdAt:    Date,
    status:                       OrderStatus,
  ) {
    this._status = status;
  }

  // ── Factory ───────────────────────────────────────────────────────────────

  static create(params: {
    id?:          string;
    customerId:   string;
    items:        OrderItem[];
    total:        Money;
    discountCode: string | null;
    discountPct:  number;
  }): Order {
    if (params.items.length === 0) {
      throw new DomainError('An order must contain at least one item');
    }
    if (params.total.isZero()) {
      throw new DomainError('Order total cannot be zero');
    }
    if (params.discountPct < 0 || params.discountPct > 100) {
      throw new DomainError(`Discount percentage must be 0–100. Got: ${params.discountPct}`);
    }

    return new Order(
      params.id ?? uuidv4(),
      params.customerId,
      params.items,
      params.total,
      params.discountCode,
      params.discountPct,
      params.total.currency,
      new Date(),
      'pending',
    );
  }

  // ── Reconstitution ────────────────────────────────────────────────────────

  static reconstitute(row: OrderRow, items: OrderItem[], total: Money): Order {
    return new Order(
      row.id,
      row.customer_id,
      items,
      total,
      row.discount_code,
      row.discount_pct,
      row.currency,
      row.created_at,
      row.status,
    );
  }

  // ── Business Methods ──────────────────────────────────────────────────────

  confirm(): void {
    if (this._status !== 'pending') {
      throw new OrderStateError(this.id, this._status, 'confirm');
    }
    this._status = 'confirmed';
  }

  cancel(): void {
    if (this._status === 'shipped' || this._status === 'cancelled' || this._status === 'refunded') {
      throw new OrderStateError(this.id, this._status, 'cancel');
    }
    this._status = 'cancelled';
  }

  ship(): void {
    if (this._status !== 'confirmed') {
      throw new OrderStateError(this.id, this._status, 'ship');
    }
    this._status = 'shipped';
  }

  get status(): OrderStatus { return this._status; }

  get isPending():   boolean { return this._status === 'pending'; }
  get isConfirmed(): boolean { return this._status === 'confirmed'; }
  get isShipped():   boolean { return this._status === 'shipped'; }
  get isCancelled(): boolean { return this._status === 'cancelled'; }

  get primaryItem(): OrderItem { return this.items[0]; }
}
