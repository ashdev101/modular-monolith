import { DomainError } from '../../../core/errors';
import { Money } from './Money';

// ─────────────────────────────────────────────────────────────────────────────
// OrderItem — Value Object.
//
// Represents a single line in an order. Immutable after construction.
// Has no database identity of its own — it belongs to the Order aggregate.
// ─────────────────────────────────────────────────────────────────────────────

export class OrderItem {
  constructor(
    public readonly productId:   string,
    public readonly productName: string,
    public readonly quantity:    number,
    public readonly unitPrice:   Money,   // price at time of order (snapshot)
  ) {
    if (!productId || productId.trim() === '') {
      throw new DomainError('OrderItem productId cannot be empty');
    }
    if (!productName || productName.trim() === '') {
      throw new DomainError('OrderItem productName cannot be empty');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new DomainError(
        `OrderItem quantity must be a positive integer. Got: ${quantity}`
      );
    }
  }

  /**
   * Subtotal = unitPrice × quantity.
   * Computed here so it's always consistent with the stored unit price.
   */
  get subtotal(): Money {
    return this.unitPrice.multiply(this.quantity);
  }
}
