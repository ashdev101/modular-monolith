import type { Request, Response } from 'express';
import { parseOrThrow } from '../../../../core/schemas/parseOrThrow';
import { respond } from '../../../../core/http/respond';
import { CreateDiscountBodySchema } from './discounts.schemas';
import type { ICreateDiscountUseCase } from '../../application/ports/commands/ICreateDiscountUseCase';
import type { IGetDiscountUseCase } from '../../application/ports/queries/IGetDiscountUseCase';

export class DiscountsController {
  constructor(
    private readonly createDiscountUseCase: ICreateDiscountUseCase,
    private readonly getDiscountUseCase:    IGetDiscountUseCase,
  ) {}

  async createDiscount(req: Request, res: Response): Promise<void> {
    const body   = parseOrThrow(CreateDiscountBodySchema, req.body, 'CreateDiscount');
    const result = await this.createDiscountUseCase.execute(body);
    respond.created(res, result);
  }

  async getDiscount(req: Request, res: Response): Promise<void> {
    const result = await this.getDiscountUseCase.execute({ code: req.params.code });
    respond.ok(res, result);
  }
}
