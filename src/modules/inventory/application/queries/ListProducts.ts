import type { IListProductsUseCase, StockSummaryView } from '../ports/queries/IListProductsUseCase';
import type { StockRepository } from '../../infrastructure/persistence/StockRepository';

export class ListProductsHandler implements IListProductsUseCase {
  constructor(private readonly repo: StockRepository) {}

  async execute(): Promise<StockSummaryView[]> {
    const products = await this.repo.findAll();
    return products.map(s => ({
      productId:      s.id,
      productName:    s.productName,
      unitPriceCents: s.unitPrice,
      quantity:       s.quantity,
      isAvailable:    s.isAvailable,
    }));
  }
}
