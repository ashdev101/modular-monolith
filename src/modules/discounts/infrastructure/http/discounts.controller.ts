import { Request, Response } from 'express';
import { DomainError, NotFoundError, ValidationError } from '../../../../core/errors';
import { parseOrThrow } from '../../../../core/schemas/parseOrThrow';
import { CreateDiscountBodySchema } from './discounts.schemas';
import type { ICreateDiscountUseCase } from '../../application/ports/commands/ICreateDiscountUseCase';
import type { IGetDiscountUseCase } from '../../application/ports/queries/IGetDiscountUseCase';

export class DiscountsController {
  constructor(
    private readonly createDiscountUseCase: ICreateDiscountUseCase,
    private readonly getDiscountUseCase:    IGetDiscountUseCase,
  ) {}

  async createDiscount(req: Request, res: Response): Promise<void> {
    try {
      const body   = parseOrThrow(CreateDiscountBodySchema, req.body, 'CreateDiscount');
      const result = await this.createDiscountUseCase.execute(body);
      res.status(201).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  async getDiscount(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getDiscountUseCase.execute({ code: req.params.code });
      res.status(200).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  private handleError(err: unknown, res: Response): void {
    if (err instanceof NotFoundError)   { res.status(404).json({ success: false, error: err.message }); return; }
    if (err instanceof ValidationError) { res.status(400).json({ success: false, error: err.message }); return; }
    if (err instanceof DomainError)     { res.status(422).json({ success: false, error: err.message }); return; }
    const asError = err as { code?: string; message?: string };
    if (asError?.code === 'CONFLICT')   { res.status(409).json({ success: false, error: asError.message }); return; }
    console.error('[DiscountsController]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
