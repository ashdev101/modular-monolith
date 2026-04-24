import type { DiscountDTO } from '../../schemas/dtos/discount.dto.schema';

/**
 * Provides read-only access to discount code data.
 *
 * Consumers: admin or reporting modules that need to inspect a discount
 *            without mutating its usage count.
 *
 * Phase 3 swap: HttpDiscountReader → GET /discounts/:code
 */
export interface IDiscountReader {
  getDiscount(code: string): Promise<DiscountDTO | null>;
}
