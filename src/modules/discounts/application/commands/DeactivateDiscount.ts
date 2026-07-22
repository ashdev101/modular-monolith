import type { IDeactivateDiscountUseCase, DeactivateDiscountCommand } from '../ports/commands/IDeactivateDiscountUseCase';
import type { DiscountRepository } from '../../infrastructure/persistence/DiscountRepository';

export class DeactivateDiscountHandler implements IDeactivateDiscountUseCase {
  constructor(private readonly repo: DiscountRepository) {}

  async execute(cmd: DeactivateDiscountCommand): Promise<void> {
    const discount = await this.repo.findByCodeOrThrow(cmd.code);
    discount.deactivate();
    await this.repo.update(discount);
  }
}
