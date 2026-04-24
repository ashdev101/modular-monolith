import type { IGetDiscountUseCase, GetDiscountQuery, DiscountView } from '../ports/queries/IGetDiscountUseCase';
import type { DiscountRepository } from '../../infrastructure/persistence/DiscountRepository';

export class GetDiscountHandler implements IGetDiscountUseCase {
  constructor(private readonly repo: DiscountRepository) {}

  async execute(query: GetDiscountQuery): Promise<DiscountView> {
    const discount = await this.repo.findByCodeOrThrow(query.code.toUpperCase());
    return {
      code:       discount.code,
      percentage: discount.percentage,
      isActive:   discount.isActive,
      isExpired:  discount.isExpired,
      expiresAt:  discount.expiresAt?.toISOString() ?? null,
      maxUsage:   discount.maxUsage,
      usageCount: discount.usageCount,
    };
  }
}
