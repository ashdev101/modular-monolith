import type { IDeleteCustomerUseCase, DeleteCustomerCommand } from '../ports/commands/IDeleteCustomerUseCase';
import type { CustomerRepository } from '../../infrastructure/persistence/CustomerRepository';

export class DeleteCustomerHandler implements IDeleteCustomerUseCase {
  constructor(private readonly repo: CustomerRepository) {}

  async execute(cmd: DeleteCustomerCommand): Promise<void> {
    await this.repo.findByIdOrThrow(cmd.customerId);
    await this.repo.delete(cmd.customerId);
  }
}
