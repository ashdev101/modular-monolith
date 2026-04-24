import type { ICreateDiscountUseCase, CreateDiscountCommand, CreateDiscountResult } from '../ports/commands/ICreateDiscountUseCase';
import { ConflictError } from '../../../../core/errors';
import { DiscountCode } from '../../domain/DiscountCode';
import type { DiscountRepository } from '../../infrastructure/persistence/DiscountRepository';

export class CreateDiscountHandler implements ICreateDiscountUseCase {
  constructor(private readonly repo: DiscountRepository) {}

  async execute(cmd: CreateDiscountCommand): Promise<CreateDiscountResult> {
    const existing = await this.repo.findByCode(cmd.code);
    if (existing) {
      throw new ConflictError(`Discount code '${cmd.code}' already exists`);
    }

    const discount = DiscountCode.create({
      code:       cmd.code,
      percentage: cmd.percentage,
      expiresAt:  cmd.expiresAt ? new Date(cmd.expiresAt) : null,
      maxUsage:   cmd.maxUsage ?? null,
    });
    await this.repo.save(discount);

    return {
      code:       discount.code,
      percentage: discount.percentage,
      expiresAt:  discount.expiresAt?.toISOString() ?? null,
      maxUsage:   discount.maxUsage,
    };
  }
}
