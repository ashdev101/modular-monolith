import type { Request, Response } from 'express';
import { parseOrThrow } from '../../../../core/schemas/parseOrThrow';
import { respond } from '../../../../core/http/respond';
import { AddProductBodySchema, UpdateStockBodySchema } from './inventory.schemas';
import type { IAddProductUseCase } from '../../application/ports/commands/IAddProductUseCase';
import type { IUpdateStockUseCase } from '../../application/ports/commands/IUpdateStockUseCase';
import type { IDeleteProductUseCase } from '../../application/ports/commands/IDeleteProductUseCase';
import type { IGetStockUseCase } from '../../application/ports/queries/IGetStockUseCase';
import type { IListProductsUseCase } from '../../application/ports/queries/IListProductsUseCase';

export class InventoryController {
  constructor(
    private readonly addProductUseCase:    IAddProductUseCase,
    private readonly updateStockUseCase:   IUpdateStockUseCase,
    private readonly deleteProductUseCase: IDeleteProductUseCase,
    private readonly getStockUseCase:      IGetStockUseCase,
    private readonly listProductsUseCase:  IListProductsUseCase,
  ) {}

  async addProduct(req: Request, res: Response): Promise<void> {
    const body   = parseOrThrow(AddProductBodySchema, req.body, 'AddProduct');
    const result = await this.addProductUseCase.execute(body);
    respond.created(res, result);
  }

  async updateStock(req: Request, res: Response): Promise<void> {
    const body   = parseOrThrow(UpdateStockBodySchema, req.body, 'UpdateStock');
    const result = await this.updateStockUseCase.execute({ productId: req.params.id, ...body });
    respond.ok(res, result);
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    await this.deleteProductUseCase.execute({ productId: req.params.id });
    respond.noContent(res);
  }

  async getStock(req: Request, res: Response): Promise<void> {
    const result = await this.getStockUseCase.execute({ productId: req.params.id });
    respond.ok(res, result);
  }

  async listProducts(_req: Request, res: Response): Promise<void> {
    const result = await this.listProductsUseCase.execute();
    respond.ok(res, result);
  }
}
