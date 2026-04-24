// ⚠️  CONSUMED EVENT — READ-ONLY COPY
// Owner: @customers-team
//
// Reserved for a future OnCustomerRegistered handler in the orders module
// (e.g. to pre-warm a local customer projection / cache).
// No handler is wired yet — add one in orders.module.ts when implementing.

export { CustomerRegistered, CustomerRegisteredSchema }
  from '../../../../core/events/payloads/customers';
