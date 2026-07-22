import { ConflictError } from '../../../../core/errors';
import type { IUpdateCustomerUseCase, UpdateCustomerCommand, UpdateCustomerResult } from '../ports/commands/IUpdateCustomerUseCase';
import type { CustomerRepository } from '../../infrastructure/persistence/CustomerRepository';

export class UpdateCustomerHandler implements IUpdateCustomerUseCase {
  constructor(private readonly repo: CustomerRepository) {}

  async execute(cmd: UpdateCustomerCommand): Promise<UpdateCustomerResult> {
    const customer = await this.repo.findByIdOrThrow(cmd.customerId);

    if (cmd.email !== customer.email) {
      const existing = await this.repo.findByEmail(cmd.email);
      if (existing) throw new ConflictError(`Email '${cmd.email}' is already registered`);
    }

    customer.updateProfile(cmd.name, cmd.email);
    await this.repo.update(customer);

    return { id: customer.id, name: customer.name, email: customer.email, isVip: customer.isVip };
  }
}
