import { v4 as uuidv4 } from 'uuid';
import { DomainError, InvalidDiscountError } from '../../../core/errors';
import type { DiscountRow } from './discount.schema';

export class DiscountCode {
  private _usageCount: number;

  private constructor(
    public readonly id:         string,
    public readonly code:       string,
    public readonly percentage: number,
    public readonly isActive:   boolean,
    public readonly expiresAt:  Date | null,
    public readonly maxUsage:   number | null,
    usageCount:                 number,
    public readonly createdAt:  Date,
  ) {
    this._usageCount = usageCount;
  }

  static create(params: {
    code:       string;
    percentage: number;
    expiresAt?: Date | null;
    maxUsage?:  number | null;
  }): DiscountCode {
    if (!params.code || params.code.trim() === '') throw new DomainError('Discount code cannot be empty');
    if (!Number.isInteger(params.percentage) || params.percentage < 1 || params.percentage > 100) {
      throw new DomainError(`Discount percentage must be an integer between 1 and 100. Got: ${params.percentage}`);
    }
    return new DiscountCode(
      uuidv4(), params.code.toUpperCase().trim(), params.percentage,
      true, params.expiresAt ?? null, params.maxUsage ?? null, 0, new Date(),
    );
  }

  static reconstitute(row: DiscountRow): DiscountCode {
    return new DiscountCode(
      row.id, row.code, row.percentage, row.is_active,
      row.expires_at, row.max_usage, row.usage_count, row.created_at,
    );
  }

  assertValid(): void {
    if (!this.isActive) throw new InvalidDiscountError(this.code, 'code is inactive');
    if (this.expiresAt && this.expiresAt < new Date()) {
      throw new InvalidDiscountError(this.code, `expired at ${this.expiresAt.toISOString()}`);
    }
    if (this.maxUsage !== null && this._usageCount >= this.maxUsage) {
      throw new InvalidDiscountError(this.code, `usage limit of ${this.maxUsage} reached`);
    }
  }

  apply(): void {
    this.assertValid();
    this._usageCount += 1;
  }

  get usageCount(): number { return this._usageCount; }

  get isDepletedAfterApply(): boolean {
    return this.maxUsage !== null && this._usageCount >= this.maxUsage;
  }

  get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt < new Date();
  }
}
