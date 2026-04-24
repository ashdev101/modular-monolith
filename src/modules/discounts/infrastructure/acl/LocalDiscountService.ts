import type { IDiscountReader } from '../../../../core/interfaces/discounts/IDiscountReader';
import type { IDiscountApplier } from '../../../../core/interfaces/discounts/IDiscountApplier';
import type { DiscountDTO } from '../../../../core/schemas/dtos/discount.dto.schema';
import type { DiscountCode } from '../../domain/DiscountCode';
import type { DiscountRepository } from '../persistence/DiscountRepository';

/**
 * LocalDiscountService — the in-process implementation of all discount
 * capabilities exposed to other modules.
 *
 * Implements IDiscountReader + IDiscountApplier as separate role interfaces.
 * IDiscountApplier is intentionally isolated: it is a write operation that
 * increments usage count. A read-only reporting module must never receive
 * this capability — it only gets IDiscountReader.
 *
 * Phase 3: replace with HttpDiscountReader / HttpDiscountApplier.
 */
export class LocalDiscountService implements IDiscountReader, IDiscountApplier {
  constructor(private readonly repo: DiscountRepository) {}

  async getDiscount(code: string): Promise<DiscountDTO | null> {
    const discount = await this.repo.findByCode(code);
    return discount ? this.toDTO(discount) : null;
  }

  async validateAndApply(code: string, _orderId: string): Promise<DiscountDTO | null> {
    const discount = await this.repo.findByCode(code);
    if (!discount) return null;
    discount.apply();
    await this.repo.update(discount);
    return this.toDTO(discount);
  }

  private toDTO(discount: DiscountCode): DiscountDTO {
    return {
      code:       discount.code,
      percentage: discount.percentage,
      isActive:   discount.isActive,
      expiresAt:  discount.expiresAt?.toISOString() ?? null,
      usageCount: discount.usageCount,
      maxUsage:   discount.maxUsage,
    };
  }
}
