// ⚠️  PUBLISHED EVENT — PUBLIC CONTRACT
// CODEOWNERS: @customers-team
//
// Fired when a new customer account is created.
// Consumers: orders/events/consumed/CustomerRegistered.v1.ts
// Never remove or rename fields.

export { CustomerRegistered, CustomerRegisteredSchema }
  from '../../../../core/events/payloads/customers';
