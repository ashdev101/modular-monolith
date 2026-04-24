import type { IGetStockUseCase, GetStockQuery, StockView } from '../ports/queries/IGetStockUseCase';
import type { StockRepository } from '../../infrastructure/persistence/StockRepository';

export class GetStockHandler implements IGetStockUseCase {
  constructor(private readonly repo: StockRepository) {}

  async execute(query: GetStockQuery): Promise<StockView> {
    const stock = await this.repo.findByIdOrThrow(query.productId);
    return {
      productId:      stock.id,
      productName:    stock.productName,
      unitPriceCents: stock.unitPrice,
      quantity:       stock.quantity,
      isAvailable:    stock.isAvailable,
    };
  }
}
