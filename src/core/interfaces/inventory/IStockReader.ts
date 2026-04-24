import type { StockDTO } from '../../schemas/dtos/stock.dto.schema';

/**
 * Provides read access to stock/product data.
 *
 * Consumers: orders (to fetch unit price and product name before creating an order).
 *
 * Phase 3 swap: HttpStockReader → GET /inventory/:id
 */
export interface IStockReader {
  getStock(productId: string): Promise<StockDTO>;
}
