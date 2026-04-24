// ⚠️  PUBLISHED EVENT — PUBLIC CONTRACT
// CODEOWNERS: @inventory-team
//
// Fired when stock drops below the low-stock threshold after an order.
// Consumers: notifications (future), purchasing (future)
// Never remove or rename fields. Add new fields in StockLow.v2.ts.

export { StockLow, StockLowSchema }
  from '../../../../core/events/payloads/inventory';
