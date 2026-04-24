import type { IGrantVipUseCase, GrantVipCommand, GrantVipResult } from '../ports/commands/IGrantVipUseCase';
import type { IEventBus } from '../../../../core/bus/EventBus';
import { Events } from '../../../../core/events/registry';
import { publishEvent } from '../../../../core/events/catalog';
import type { CustomerRepository } from '../../infrastructure/persistence/CustomerRepository';

export class GrantVipHandler implements IGrantVipUseCase {
  constructor(
    private readonly repo:     CustomerRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(cmd: GrantVipCommand): Promise<GrantVipResult> {
    const customer = await this.repo.findByIdOrThrow(cmd.customerId);
    customer.grantVip();
    await this.repo.update(customer);

    await publishEvent(this.eventBus, Events.customers.VIP_GRANTED, {
      correlationId: customer.id,
      causationId:   customer.id,
      payload: { customerId: customer.id, name: customer.name, vipGrantedAt: customer.vipGrantedAt!.toISOString() },
    });

    return { id: customer.id, isVip: customer.isVip };
  }
}
