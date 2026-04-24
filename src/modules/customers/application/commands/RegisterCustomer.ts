import type { IRegisterCustomerUseCase, RegisterCustomerCommand, RegisterCustomerResult } from '../ports/commands/IRegisterCustomerUseCase';
import type { IEventBus } from '../../../../core/bus/EventBus';
import { Events } from '../../../../core/events/registry';
import { publishEvent } from '../../../../core/events/catalog';
import { ConflictError } from '../../../../core/errors';
import { Customer } from '../../domain/Customer';
import type { CustomerRepository } from '../../infrastructure/persistence/CustomerRepository';

export class RegisterCustomerHandler implements IRegisterCustomerUseCase {
  constructor(
    private readonly repo:     CustomerRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(cmd: RegisterCustomerCommand): Promise<RegisterCustomerResult> {
    const existing = await this.repo.findByEmail(cmd.email);
    if (existing) {
      throw new ConflictError(`Email '${cmd.email}' is already registered`);
    }

    const customer = Customer.register(cmd.name, cmd.email);
    await this.repo.save(customer);

    await publishEvent(this.eventBus, Events.customers.REGISTERED, {
      correlationId: customer.id,
      causationId:   customer.id,
      payload: { customerId: customer.id, name: customer.name, email: customer.email, isVip: customer.isVip },
    });

    return {
      id:        customer.id,
      name:      customer.name,
      email:     customer.email,
      isVip:     customer.isVip,
      createdAt: customer.createdAt.toISOString(),
    };
  }
}
