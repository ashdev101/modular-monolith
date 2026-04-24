import type { IAddProductUseCase, AddProductCommand, AddProductResult } from '../ports/commands/IAddProductUseCase';
import { Stock } from '../../domain/Stock';
import type { StockRepository } from '../../infrastructure/persistence/StockRepository';

export class AddProductHandler implements IAddProductUseCase {
  constructor(private readonly repo: StockRepository) {}

  async execute(cmd: AddProductCommand): Promise<AddProductResult> {
    const stock = Stock.create(cmd.productName, cmd.unitPrice, cmd.quantity);
    await this.repo.save(stock);
    return {
      productId:   stock.id,
      productName: stock.productName,
      unitPrice:   stock.unitPrice,
      quantity:    stock.quantity,
    };
  }
}
