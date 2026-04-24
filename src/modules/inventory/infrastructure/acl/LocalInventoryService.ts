import type { IStockReader } from '../../../../core/interfaces/inventory/IStockReader';
import type { IStockAvailabilityChecker } from '../../../../core/interfaces/inventory/IStockAvailabilityChecker';
import type { StockDTO } from '../../../../core/schemas/dtos/stock.dto.schema';
import { NotFoundError } from '../../../../core/errors';
import type { StockRepository } from '../persistence/StockRepository';

/**
 * LocalInventoryService — the in-process implementation of all inventory
 * capabilities exposed to other modules.
 *
 * Implements IStockReader + IStockAvailabilityChecker as separate role interfaces.
 * Orders depends on both; a future display/catalogue module might only depend
 * on IStockReader and never receive the availability-check capability.
 *
 * Phase 3: replace with HttpStockReader / HttpStockAvailabilityChecker.
 */
export class LocalInventoryService implements IStockReader, IStockAvailabilityChecker {
  constructor(private readonly repo: StockRepository) {}

  async getStock(productId: string): Promise<StockDTO> {
    const stock = await this.repo.findById(productId);
    if (!stock) throw new NotFoundError('Product', productId);
    return {
      productId:    stock.id,
      productName:  stock.productName,
      unitPrice:    stock.unitPrice,
      quantity:     stock.quantity,
      reservedQty:  0,
      availableQty: stock.quantity,
    };
  }

  async checkAvailability(productId: string, quantity: number): Promise<boolean> {
    const stock = await this.repo.findById(productId);
    if (!stock) return false;
    return stock.canFulfil(quantity);
  }
}
