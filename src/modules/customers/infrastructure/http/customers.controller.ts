import { Request, Response } from 'express';
import { DomainError, NotFoundError, ValidationError } from '../../../../core/errors';
import { parseOrThrow } from '../../../../core/schemas/parseOrThrow';
import { RegisterCustomerBodySchema } from './customers.schemas';
import type { IRegisterCustomerUseCase } from '../../application/ports/commands/IRegisterCustomerUseCase';
import type { IGrantVipUseCase } from '../../application/ports/commands/IGrantVipUseCase';
import type { IGetCustomerUseCase } from '../../application/ports/queries/IGetCustomerUseCase';
import type { IListCustomersUseCase } from '../../application/ports/queries/IListCustomersUseCase';

export class CustomersController {
  constructor(
    private readonly registerCustomerUseCase: IRegisterCustomerUseCase,
    private readonly grantVipUseCase:         IGrantVipUseCase,
    private readonly getCustomerUseCase:      IGetCustomerUseCase,
    private readonly listCustomersUseCase:    IListCustomersUseCase,
  ) {}

  async registerCustomer(req: Request, res: Response): Promise<void> {
    try {
      const body   = parseOrThrow(RegisterCustomerBodySchema, req.body, 'RegisterCustomer');
      const result = await this.registerCustomerUseCase.execute({ name: body.name, email: body.email });
      res.status(201).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  async getCustomer(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getCustomerUseCase.execute({ customerId: req.params.id });
      res.status(200).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  async listCustomers(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.listCustomersUseCase.execute();
      res.status(200).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  async grantVip(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.grantVipUseCase.execute({ customerId: req.params.id });
      res.status(200).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  private handleError(err: unknown, res: Response): void {
    if (err instanceof NotFoundError)   { res.status(404).json({ success: false, error: err.message }); return; }
    if (err instanceof ValidationError) { res.status(400).json({ success: false, error: err.message }); return; }
    if (err instanceof DomainError)     { res.status(422).json({ success: false, error: err.message }); return; }
    const asError = err as { code?: string; message?: string };
    if (asError?.code === 'CONFLICT')   { res.status(409).json({ success: false, error: asError.message }); return; }
    console.error('[CustomersController]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
