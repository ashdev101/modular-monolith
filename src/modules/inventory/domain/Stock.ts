import { v4 as uuidv4 } from 'uuid';
import { DomainError, InsufficientStockError } from '../../../core/errors';
import type { StockRow } from './stock.schema';

export interface StockDecrementResult {
  isLow:      boolean;
  isDepleted: boolean;
}

export class Stock {
  static readonly LOW_STOCK_THRESHOLD = 5;

  private _quantity: number;

  private constructor(
    public readonly id:          string,
    public readonly productName: string,
    public readonly unitPrice:   number,
    quantity:                    number,
    public readonly createdAt:   Date,
  ) {
    this._quantity = quantity;
  }

  static create(productName: string, unitPrice: number, initialQty: number): Stock {
    if (!productName || productName.trim() === '') throw new DomainError('Product name cannot be empty');
    if (unitPrice <= 0) throw new DomainError(`Unit price must be positive. Got: ${unitPrice}`);
    if (!Number.isInteger(initialQty) || initialQty < 0) {
      throw new DomainError(`Initial quantity must be a non-negative integer. Got: ${initialQty}`);
    }
    return new Stock(uuidv4(), productName.trim(), unitPrice, initialQty, new Date());
  }

  static reconstitute(row: StockRow): Stock {
    return new Stock(row.id, row.product_name, row.unit_price, row.quantity, row.created_at);
  }

  decrement(qty: number): StockDecrementResult {
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new DomainError(`Decrement quantity must be a positive integer. Got: ${qty}`);
    }
    if (this._quantity < qty) throw new InsufficientStockError(this.id, qty, this._quantity);
    this._quantity -= qty;
    return {
      isLow:      this._quantity < Stock.LOW_STOCK_THRESHOLD && this._quantity > 0,
      isDepleted: this._quantity === 0,
    };
  }

  restore(qty: number): void {
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new DomainError(`Restore quantity must be a positive integer. Got: ${qty}`);
    }
    this._quantity += qty;
  }

  get quantity(): number          { return this._quantity; }
  get isAvailable(): boolean      { return this._quantity > 0; }
  canFulfil(qty: number): boolean { return this._quantity >= qty; }
}
