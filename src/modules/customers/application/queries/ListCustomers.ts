import type { IListCustomersUseCase, CustomerSummaryView } from '../ports/queries/IListCustomersUseCase';
import type { CustomerRepository } from '../../infrastructure/persistence/CustomerRepository';

export class ListCustomersHandler implements IListCustomersUseCase {
  constructor(private readonly repo: CustomerRepository) {}

  async execute(): Promise<CustomerSummaryView[]> {
    const customers = await this.repo.findAll();
    return customers.map(c => ({ id: c.id, name: c.name, email: c.email, isVip: c.isVip }));
  }
}
