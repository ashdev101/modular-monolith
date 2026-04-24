import { sql } from 'slonik';
import type { DatabasePool } from '../../../../core/database/pool';
import { NotFoundError } from '../../../../core/errors';
import { DiscountCode } from '../../domain/DiscountCode';
import { DiscountRowSchema } from '../../domain/discount.schema';

const SELECT_COLS = sql.fragment`
  id, code, percentage, is_active, expires_at, max_usage, usage_count, created_at
`;
const now = () => new Date().toISOString();

export class DiscountRepository {
  constructor(private readonly pool: DatabasePool) {}

  async save(discount: DiscountCode): Promise<void> {
    await this.pool.query(sql.unsafe`
      INSERT INTO discounts.codes
        (id, code, percentage, is_active, expires_at, max_usage, usage_count, created_at, updated_at)
      VALUES (
        ${discount.id},
        ${discount.code},
        ${discount.percentage},
        ${discount.isActive},
        ${discount.expiresAt?.toISOString() ?? null},
        ${discount.maxUsage},
        ${discount.usageCount},
        ${discount.createdAt.toISOString()},
        ${now()}
      )
    `);
  }

  async update(discount: DiscountCode): Promise<void> {
    await this.pool.query(sql.unsafe`
      UPDATE discounts.codes
      SET usage_count = ${discount.usageCount},
          is_active   = ${discount.isActive},
          updated_at  = ${now()}
      WHERE id = ${discount.id}
    `);
  }

  async findByCode(code: string): Promise<DiscountCode | null> {
    const row = await this.pool.maybeOne(sql.type(DiscountRowSchema)`
      SELECT ${SELECT_COLS} FROM discounts.codes WHERE code = ${code.toUpperCase()}
    `);
    return row ? DiscountCode.reconstitute(row) : null;
  }

  async findByCodeOrThrow(code: string): Promise<DiscountCode> {
    const discount = await this.findByCode(code);
    if (!discount) throw new NotFoundError('DiscountCode', code);
    return discount;
  }
}
