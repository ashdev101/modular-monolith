import { Request, Response } from 'express';
import { DomainError, NotFoundError, ValidationError } from '../../../../core/errors';
import { parseOrThrow } from '../../../../core/schemas/parseOrThrow';
import { AddProductBodySchema } from './inventory.schemas';
import type { IAddProductUseCase } from '../../application/ports/commands/IAddProductUseCase';
import type { IGetStockUseCase } from '../../application/ports/queries/IGetStockUseCase';
import type { IListProductsUseCase } from '../../application/ports/queries/IListProductsUseCase';

export class InventoryController {
  constructor(
    private readonly addProductUseCase:   IAddProductUseCase,
    private readonly getStockUseCase:     IGetStockUseCase,
    private readonly listProductsUseCase: IListProductsUseCase,
  ) {}

  async addProduct(req: Request, res: Response): Promise<void> {
    try {
      const body   = parseOrThrow(AddProductBodySchema, req.body, 'AddProduct');
      const result = await this.addProductUseCase.execute(body);
      res.status(201).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  async getStock(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getStockUseCase.execute({ productId: req.params.id });
      res.status(200).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  async listProducts(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.listProductsUseCase.execute();
      res.status(200).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  private handleError(err: unknown, res: Response): void {
    if (err instanceof NotFoundError)   { res.status(404).json({ success: false, error: err.message }); return; }
    if (err instanceof ValidationError) { res.status(400).json({ success: false, error: err.message }); return; }
    if (err instanceof DomainError)     { res.status(422).json({ success: false, error: err.message }); return; }
    console.error('[InventoryController]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
