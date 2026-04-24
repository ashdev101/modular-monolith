import { sql, type FragmentSqlToken } from 'slonik';
import { type ZodType } from 'zod';
import type { DatabasePool } from '../../../../core/database/pool';
import { BaseRepository } from '../../../../core/repository/BaseRepository';
import { NotFoundError } from '../../../../core/errors';
import { DiscountCode } from '../../domain/DiscountCode';
import { DiscountRowSchema, type DiscountRow } from '../../domain/discount.schema';

const SELECT_COLS = sql.fragment`
  id, code, percentage, is_active, expires_at, max_usage, usage_count, created_at
`;

export class DiscountRepository extends BaseRepository<DiscountRow, DiscountCode> {
  protected readonly schema: ZodType<DiscountRow> = DiscountRowSchema;
  protected readonly table = 'discounts.codes';
  protected readonly entityName = 'DiscountCode';
  protected readonly selectCols: FragmentSqlToken = SELECT_COLS;

  constructor(pool: DatabasePool) {
    super(pool);
  }

  protected toDomain(row: DiscountRow): DiscountCode {
    return DiscountCode.reconstitute(row);
  }

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
        ${this.now()}
      )
    `);
  }

  async update(discount: DiscountCode): Promise<void> {
    await this.pool.query(sql.unsafe`
      UPDATE discounts.codes
      SET usage_count = ${discount.usageCount},
          is_active   = ${discount.isActive},
          updated_at  = ${this.now()}
      WHERE id = ${discount.id}
    `);
  }

  // findByCode uses a value transform (toUpperCase) so it goes through pool directly
  // rather than findRowsWhere — explicit query, explicit column list, fully typed result.
  async findByCode(code: string): Promise<DiscountCode | null> {
    const row = await this.pool.maybeOne(sql.type(DiscountRowSchema)`
      SELECT ${this.selectCols} FROM discounts.codes WHERE code = ${code.toUpperCase()}
    `);
    return row ? this.toDomain(row) : null;
  }

  async findByCodeOrThrow(code: string): Promise<DiscountCode> {
    const discount = await this.findByCode(code);
    if (!discount) throw new NotFoundError('DiscountCode', code);
    return discount;
  }
}
