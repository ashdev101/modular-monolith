import type { DiscountDTO } from '../../schemas/dtos/discount.dto.schema';

/**
 * Validates a discount code and atomically increments its usage count.
 *
 * Consumers: orders (apply discount at order creation time).
 *
 * Deliberately separate from IDiscountReader — applying a discount is a
 * write operation with idempotency concerns. A read-only reporting service
 * must never be given this capability.
 *
 * Phase 3 swap: HttpDiscountApplier → POST /discounts/:code/apply
 */
export interface IDiscountApplier {
  validateAndApply(code: string, orderId: string): Promise<DiscountDTO | null>;
}
