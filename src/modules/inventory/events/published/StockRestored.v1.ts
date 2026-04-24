// ⚠️  PUBLISHED EVENT — PUBLIC CONTRACT
// CODEOWNERS: @inventory-team
//
// Fired when stock is put back after an order cancellation.
// Consumers: none yet

export { StockRestored, StockRestoredSchema }
  from '../../../../core/events/payloads/inventory';
