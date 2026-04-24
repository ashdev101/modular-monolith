import { DomainError } from '../../../core/errors';

// ─────────────────────────────────────────────────────────────────────────────
// Money — Value Object.
//
// Immutable. No identity. Two Money instances with the same amount + currency
// are considered equal. All arithmetic returns a NEW Money instance.
//
// Amounts are stored in cents to avoid floating-point rounding bugs.
// ─────────────────────────────────────────────────────────────────────────────

export class Money {
  private constructor(
    public readonly amount:   number,   // always in cents, integer
    public readonly currency: string,   // ISO 4217: 'USD', 'EUR', …
  ) {
    if (!Number.isInteger(amount)) {
      throw new DomainError(`Money amount must be an integer (cents). Got: ${amount}`);
    }
    if (amount < 0) {
      throw new DomainError(`Money amount cannot be negative. Got: ${amount}`);
    }
    if (currency.length !== 3) {
      throw new DomainError(`Currency must be a 3-char ISO code. Got: '${currency}'`);
    }
  }

  static ofCents(cents: number, currency = 'USD'): Money {
    return new Money(Math.round(cents), currency);
  }

  static zero(currency = 'USD'): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new DomainError(
        `Cannot subtract: result would be negative (${this.amount} - ${other.amount})`
      );
    }
    return new Money(result, this.currency);
  }

  /**
   * Multiply by a factor (e.g. 2 for doubling, 0.9 for 10% discount).
   * Rounds to the nearest cent.
   */
  multiply(factor: number): Money {
    return new Money(Math.round(this.amount * factor), this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  /** Human-readable representation for logging */
  toString(): string {
    return `${this.currency} ${(this.amount / 100).toFixed(2)}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainError(
        `Currency mismatch: cannot operate on ${this.currency} and ${other.currency}`
      );
    }
  }
}
