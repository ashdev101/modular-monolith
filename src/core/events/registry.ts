// ─────────────────────────────────────────────────────────────────────────────
// Event Registry — the ONLY place event name strings are defined.
//
// Rule: Never use a raw string for an event name anywhere in the codebase.
//       Always reference Events.orders.CREATED, never 'orders.order.created'.
//       TypeScript will catch a typo here at compile time, not at 3am in prod.
// ─────────────────────────────────────────────────────────────────────────────

export const Events = {
  orders: {
    CREATED:   'orders.order.created',
    CANCELLED: 'orders.order.cancelled',
    SHIPPED:   'orders.order.shipped',
    REFUNDED:  'orders.order.refunded',
  },
  inventory: {
    STOCK_LOW:      'inventory.stock.low',       // < threshold
    STOCK_DEPLETED: 'inventory.stock.depleted',  // = 0
    STOCK_RESTORED: 'inventory.stock.restored',  // after cancellation
  },
  customers: {
    REGISTERED:  'customers.customer.registered',
    VIP_GRANTED: 'customers.customer.vip_granted',
    VIP_REVOKED: 'customers.customer.vip_revoked',
  },
  discounts: {
    APPLIED:  'discounts.discount.applied',
    EXPIRED:  'discounts.discount.expired',
    DEPLETED: 'discounts.discount.depleted',  // max usage reached
  },
} as const;

// Compile-time exhaustive union of every event name string.
//
// Why not the clever double-index trick?
//   typeof Events[keyof typeof Events][keyof typeof Events[keyof typeof Events]]
//
// That resolves to `never`.  When you keyof a *union* of objects whose keys
// don't overlap (orders/inventory/customers/discounts have different keys),
// TypeScript gives you the INTERSECTION of those key sets — which is empty.
// Union[never] = never.
//
// The correct form: union the values of each sub-object separately.
export type EventName =
  | typeof Events.orders[keyof typeof Events.orders]
  | typeof Events.inventory[keyof typeof Events.inventory]
  | typeof Events.customers[keyof typeof Events.customers]
  | typeof Events.discounts[keyof typeof Events.discounts];
