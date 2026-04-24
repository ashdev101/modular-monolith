import type { IGetCustomerUseCase, GetCustomerQuery, CustomerView } from '../ports/queries/IGetCustomerUseCase';
import type { CustomerRepository } from '../../infrastructure/persistence/CustomerRepository';

export class GetCustomerHandler implements IGetCustomerUseCase {
  constructor(private readonly repo: CustomerRepository) {}

  async execute(query: GetCustomerQuery): Promise<CustomerView> {
    const customer = await this.repo.findByIdOrThrow(query.customerId);
    return {
      id:           customer.id,
      name:         customer.name,
      email:        customer.email,
      isVip:        customer.isVip,
      vipGrantedAt: customer.vipGrantedAt?.toISOString() ?? null,
      createdAt:    customer.createdAt.toISOString(),
    };
  }
}
