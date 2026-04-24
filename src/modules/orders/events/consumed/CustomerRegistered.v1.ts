// ⚠️  CONSUMED EVENT — READ-ONLY COPY
// Owner: @customers-team
//
// The orders module subscribes to this to pre-cache VIP status.
// Never modify this file — if the shape changes, customers-team
// publishes v2 and we update our handler to handle both versions.

export { CustomerRegistered, CustomerRegisteredSchema }
  from '../../../../core/events/payloads/customers';
