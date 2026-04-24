import type { ICustomerReader } from '../../../../core/interfaces/customers/ICustomerReader';
import type { ICustomerValidator } from '../../../../core/interfaces/customers/ICustomerValidator';
import type { CustomerDTO } from '../../../../core/schemas/dtos/customer.dto.schema';
import { NotFoundError } from '../../../../core/errors';
import type { CustomerRepository } from '../persistence/CustomerRepository';

/**
 * LocalCustomerService — the in-process implementation of all customer
 * capabilities exposed to other modules.
 *
 * Implements ICustomerReader  + ICustomerValidator as separate role interfaces.
 * Each consuming module only receives the specific interface it declares a
 * dependency on — it never sees this concrete class.
 *
 * Phase 3: replace with HttpCustomerReader / HttpCustomerValidator that call
 * the extracted customer microservice. Each HTTP adapter implements exactly
 * one role interface — minimal surface, minimal blast radius.
 */
export class LocalCustomerService implements ICustomerReader, ICustomerValidator {
  constructor(private readonly repo: CustomerRepository) {}

  async getCustomer(customerId: string): Promise<CustomerDTO> {
    const customer = await this.repo.findById(customerId);
    if (!customer) throw new NotFoundError('Customer', customerId);
    return {
      id:        customer.id,
      name:      customer.name,
      email:     customer.email,
      isVip:     customer.isVip,
      createdAt: customer.createdAt.toISOString(),
    };
  }

  async customerExists(customerId: string): Promise<boolean> {
    return this.repo.existsById(customerId);
  }
}
