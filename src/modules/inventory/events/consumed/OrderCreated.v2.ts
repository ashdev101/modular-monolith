// ⚠️  CONSUMED EVENT — READ-ONLY COPY
// Owner: @orders-team
//
// Inventory subscribes to this to decrement stock after an order is placed.
// Do NOT modify this file unilaterally. If orders-team publishes a v3,
// add OrderCreated.v3.ts here and update OnOrderCreated to handle it.
// The upcaster in core/events/versions/ handles v1→v2 conversion.

export { OrderCreated, OrderCreatedSchema }
  from '../../../../core/events/payloads/orders';

// v1 type + upcaster — needed by OnOrderCreated.handle() for backward compatibility
export { OrderCreatedV1 }
  from '../../../../core/events/versions/orders.created.v1.schema';
export { upcastV1toV2 as upcastOrderCreatedV1toV2 }
  from '../../../../core/events/versions/orders.created.v2.schema';
