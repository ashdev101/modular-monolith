// ⚠️  PUBLISHED EVENT — PUBLIC CONTRACT
// CODEOWNERS: @customers-team
//
// Fired when a customer is promoted to VIP status.
// Consumers: discounts (future — unlock VIP codes)

export { CustomerVipGranted, CustomerVipGrantedSchema }
  from '../../../../core/events/payloads/customers';
