// ⚠️  PUBLISHED EVENT — PUBLIC CONTRACT
// CODEOWNERS: @inventory-team
//
// Fired when stock hits zero after an order.
// Consumers: notifications (future)

export { StockDepleted, StockDepletedSchema }
  from '../../../../core/events/payloads/inventory';
