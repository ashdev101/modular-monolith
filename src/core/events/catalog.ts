import { z } from 'zod';
import { Events, EventName } from './registry';
import type { IEventBus } from '../bus/IEventBus';

// ── Payload schemas ────────────────────────────────────────────────────────
import {
  OrderCreatedSchema, OrderCreated,
  OrderCancelledSchema, OrderCancelled,
  OrderShippedSchema,  OrderShipped,
  OrderRefundedSchema, OrderRefunded,
} from './payloads/orders';
import {
  StockLowSchema, StockLow,
  StockDepletedSchema, StockDepleted,
  StockRestoredSchema, StockRestored,
} from './payloads/inventory';
import {
  CustomerRegisteredSchema, CustomerRegistered,
  CustomerVipGrantedSchema, CustomerVipGranted,
  CustomerVipRevokedSchema, CustomerVipRevoked,
} from './payloads/customers';
import {
  DiscountAppliedSchema, DiscountApplied,
  DiscountExpiredSchema, DiscountExpired,
  DiscountDepletedSchema, DiscountDepleted,
} from './payloads/discounts';

// ─────────────────────────────────────────────────────────────────────────────
// EventCatalog — the single source of truth for every event in the system.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  NEW DEVELOPER GUIDE — where to start:                                  │
// │                                                                         │
// │  1. What events exist?         → look at EventCatalog keys below        │
// │  2. What does event X carry?   → look at its .schema / EventPayloadMap  │
// │  3. Who fires event X?         → look at .publishedBy                   │
// │  4. Who reacts to event X?     → look at .subscribedBy                  │
// │  5. What changed in v2?        → look at .changelog                     │
// │  6. How do I publish safely?   → use publishEvent() helper below        │
// └─────────────────────────────────────────────────────────────────────────┘
//
// Rules:
//   • Every event MUST have an entry here before it can be published.
//   • schemaVersion here = current version; bump on any additive change.
//   • Old versions live in events/versions/ with upcaster functions.
//   • publishedBy / subscribedBy must be updated when handlers change.
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogEntry {
  /** Zod schema — used for runtime validation at broker boundaries */
  schema: z.ZodTypeAny;
  /** Current version; bumped on every additive (backward-compatible) change */
  schemaVersion: number;
  /** One-line human description of when this event fires */
  description: string;
  /** Module + class that calls publishEvent() for this event */
  publishedBy: string;
  /** Modules + classes that call eventBus.subscribe() for this event */
  subscribedBy: string[];
  /** What changed between versions */
  changelog?: Record<number, string>;
}

export const EventCatalog: Record<EventName, CatalogEntry> = {

  // ── Orders ──────────────────────────────────────────────────────────────

  [Events.orders.CREATED]: {
    schema:        OrderCreatedSchema,
    schemaVersion: 2,
    description:   'Fired after an order is persisted and payment accepted',
    publishedBy:   'orders → CreateOrderHandler',
    subscribedBy:  ['inventory → OnOrderCreated'],
    changelog: {
      1: 'Initial shape: orderId, customerId, productId, quantity, total',
      2: 'Added currency (ISO 4217) and discountPct fields',
    },
  },

  [Events.orders.CANCELLED]: {
    schema:        OrderCancelledSchema,
    schemaVersion: 1,
    description:   'Fired when a customer or admin cancels an order',
    publishedBy:   'orders → CancelOrderHandler',
    subscribedBy:  ['inventory → OnOrderCancelled'],
  },

  [Events.orders.SHIPPED]: {
    schema:        OrderShippedSchema,
    schemaVersion: 1,
    description:   'Fired when the warehouse marks an order as shipped',
    publishedBy:   'orders → ShipOrderHandler (not yet implemented)',
    subscribedBy:  [],
  },

  [Events.orders.REFUNDED]: {
    schema:        OrderRefundedSchema,
    schemaVersion: 1,
    description:   'Fired when a refund is processed for a cancelled/returned order',
    publishedBy:   'orders → RefundOrderHandler (not yet implemented)',
    subscribedBy:  [],
  },

  // ── Inventory ────────────────────────────────────────────────────────────

  [Events.inventory.STOCK_LOW]: {
    schema:        StockLowSchema,
    schemaVersion: 1,
    description:   'Fired when stock drops below the low-stock threshold',
    publishedBy:   'inventory → OnOrderCreated',
    subscribedBy:  [],
  },

  [Events.inventory.STOCK_DEPLETED]: {
    schema:        StockDepletedSchema,
    schemaVersion: 1,
    description:   'Fired when stock reaches zero after an order',
    publishedBy:   'inventory → OnOrderCreated',
    subscribedBy:  [],
  },

  [Events.inventory.STOCK_RESTORED]: {
    schema:        StockRestoredSchema,
    schemaVersion: 1,
    description:   'Fired when stock is restored after an order cancellation',
    publishedBy:   'inventory → OnOrderCancelled',
    subscribedBy:  [],
  },

  // ── Customers ────────────────────────────────────────────────────────────

  [Events.customers.REGISTERED]: {
    schema:        CustomerRegisteredSchema,
    schemaVersion: 1,
    description:   'Fired when a new customer account is created',
    publishedBy:   'customers → CustomersController.registerCustomer()',
    subscribedBy:  [],
  },

  [Events.customers.VIP_GRANTED]: {
    schema:        CustomerVipGrantedSchema,
    schemaVersion: 1,
    description:   'Fired when a customer is promoted to VIP status',
    publishedBy:   'customers → CustomersController.grantVip()',
    subscribedBy:  [],
  },

  [Events.customers.VIP_REVOKED]: {
    schema:        CustomerVipRevokedSchema,
    schemaVersion: 1,
    description:   'Fired when a customer loses VIP status',
    publishedBy:   'customers → RevokeVipHandler (not yet implemented)',
    subscribedBy:  [],
  },

  // ── Discounts ────────────────────────────────────────────────────────────

  [Events.discounts.APPLIED]: {
    schema:        DiscountAppliedSchema,
    schemaVersion: 1,
    description:   'Fired when a discount code is successfully applied to an order',
    publishedBy:   'orders → CreateOrderHandler (not yet implemented)',
    subscribedBy:  [],
  },

  [Events.discounts.EXPIRED]: {
    schema:        DiscountExpiredSchema,
    schemaVersion: 1,
    description:   'Fired when a discount code passes its expiry date',
    publishedBy:   'discounts → ExpiryJob (not yet implemented)',
    subscribedBy:  [],
  },

  [Events.discounts.DEPLETED]: {
    schema:        DiscountDepletedSchema,
    schemaVersion: 1,
    description:   'Fired when a discount code hits its max usage count',
    publishedBy:   'discounts → ApplyDiscountHandler (not yet implemented)',
    subscribedBy:  [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EventPayloadMap — the explicit type map that drives publish() type inference.
//
// Why explicit instead of derived (z.infer from catalog)?
// TypeScript can't index a generic mapped-type over a union of literal keys
// when the values have heterogeneous Zod schemas — it collapses to `never`.
// An explicit map is simpler, faster to compile, and equally type-safe.
// ─────────────────────────────────────────────────────────────────────────────

export type EventPayloadMap = {
  [Events.orders.CREATED]:   OrderCreated;
  [Events.orders.CANCELLED]: OrderCancelled;
  [Events.orders.SHIPPED]:   OrderShipped;
  [Events.orders.REFUNDED]:  OrderRefunded;

  [Events.inventory.STOCK_LOW]:      StockLow;
  [Events.inventory.STOCK_DEPLETED]: StockDepleted;
  [Events.inventory.STOCK_RESTORED]: StockRestored;

  [Events.customers.REGISTERED]:  CustomerRegistered;
  [Events.customers.VIP_GRANTED]: CustomerVipGranted;
  [Events.customers.VIP_REVOKED]: CustomerVipRevoked;

  [Events.discounts.APPLIED]:  DiscountApplied;
  [Events.discounts.EXPIRED]:  DiscountExpired;
  [Events.discounts.DEPLETED]: DiscountDepleted;
};

// Derive a single payload type for a given event name.
export type EventPayload<TEventName extends EventName> = EventPayloadMap[TEventName];

// ─────────────────────────────────────────────────────────────────────────────
// publishEvent — type-safe wrapper around IEventBus.publish()
//
//   BEFORE (error-prone):
//     await bus.publish<OrderCancelledPayload>({
//       eventName:     Events.orders.CANCELLED,
//       schemaVersion: 1,           ← magic number; easy to forget or get wrong
//       correlationId: ...,
//       causationId:   ...,
//       payload: { orderId, customerId, productId, quantity, reason },
//       //        ↑ TypeScript only checks this IF you passed the right generic
//     });
//
//   AFTER (type-safe):
//     await publishEvent(bus, Events.orders.CANCELLED, {
//       correlationId: ...,
//       causationId:   ...,
//       payload: { orderId, customerId, productId, quantity, reason },
//       //        ↑ TypeScript infers OrderCancelled from the catalog automatically
//       //          Typo in a field name? Compile error. Missing field? Compile error.
//       //          Wrong type? Compile error. schemaVersion auto-filled from catalog.
//     });
//
// ─────────────────────────────────────────────────────────────────────────────

export interface PublishEventInput<TPayload> {
  correlationId: string;
  causationId:   string;
  payload:       TPayload;
  /** Override the catalog's default schemaVersion. Rarely needed. */
  schemaVersion?: number;
}

// Use `keyof EventPayloadMap` (not EventName) as the constraint so TypeScript
// can directly look up the payload type without an extra indirection that it
// can't always resolve in generic position.
export function publishEvent<TEventName extends keyof EventPayloadMap>(
  bus:       IEventBus,
  eventName: TEventName,
  input:     PublishEventInput<EventPayloadMap[TEventName]>,
): Promise<void> {
  const entry = EventCatalog[eventName as EventName];
  return bus.publish<EventPayloadMap[TEventName]>({
    eventName,
    schemaVersion: input.schemaVersion ?? entry.schemaVersion,
    correlationId: input.correlationId,
    causationId:   input.causationId,
    payload:       input.payload,
  });
}
