import type { IUpdateStockUseCase, UpdateStockCommand, UpdateStockResult } from '../ports/commands/IUpdateStockUseCase';
import type { StockRepository } from '../../infrastructure/persistence/StockRepository';

export class UpdateStockHandler implements IUpdateStockUseCase {
  constructor(private readonly repo: StockRepository) {}

  async execute(cmd: UpdateStockCommand): Promise<UpdateStockResult> {
    const stock = await this.repo.findByIdOrThrow(cmd.productId);
    stock.updateDetails(cmd.productName, cmd.unitPrice);
    await this.repo.update(stock);
    return { productId: stock.id, productName: stock.productName, unitPrice: stock.unitPrice, quantity: stock.quantity };
  }
}
