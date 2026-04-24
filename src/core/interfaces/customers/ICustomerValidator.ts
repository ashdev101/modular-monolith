/**
 * Verifies customer existence without fetching full customer data.
 *
 * Consumers: any module that needs to guard on customer existence
 *            without needing the full CustomerDTO.
 *
 * Phase 3 swap: HttpCustomerValidator → HEAD /customers/:id
 */
export interface ICustomerValidator {
  customerExists(customerId: string): Promise<boolean>;
}
