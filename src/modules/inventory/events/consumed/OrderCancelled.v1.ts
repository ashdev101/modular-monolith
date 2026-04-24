// ⚠️  CONSUMED EVENT — READ-ONLY COPY
// Owner: @orders-team
//
// Inventory subscribes to this to restore stock after a cancellation.

export { OrderCancelled, OrderCancelledSchema }
  from '../../../../core/events/payloads/orders';
