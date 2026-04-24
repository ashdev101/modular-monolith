import type { CustomerDTO } from '../../schemas/dtos/customer.dto.schema';

/**
 * Provides read access to customer data.
 *
 * Consumers: orders (to fetch customer details before placing an order).
 *
 * Phase 3 swap: HttpCustomerReader → GET /customers/:id
 * Only this method needs to be implemented — nothing else.
 */
export interface ICustomerReader {
  getCustomer(customerId: string): Promise<CustomerDTO>;
}
