import type { IDeleteProductUseCase, DeleteProductCommand } from '../ports/commands/IDeleteProductUseCase';
import type { StockRepository } from '../../infrastructure/persistence/StockRepository';

export class DeleteProductHandler implements IDeleteProductUseCase {
  constructor(private readonly repo: StockRepository) {}

  async execute(cmd: DeleteProductCommand): Promise<void> {
    await this.repo.findByIdOrThrow(cmd.productId);
    await this.repo.delete(cmd.productId);
  }
}
