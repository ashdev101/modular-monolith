import type { Request, Response } from 'express';
import { parseOrThrow } from '../../../../core/schemas/parseOrThrow';
import { respond } from '../../../../core/http/respond';
import { RegisterCustomerBodySchema, UpdateCustomerBodySchema } from './customers.schemas';
import type { IRegisterCustomerUseCase } from '../../application/ports/commands/IRegisterCustomerUseCase';
import type { IUpdateCustomerUseCase } from '../../application/ports/commands/IUpdateCustomerUseCase';
import type { IDeleteCustomerUseCase } from '../../application/ports/commands/IDeleteCustomerUseCase';
import type { IGrantVipUseCase } from '../../application/ports/commands/IGrantVipUseCase';
import type { IGetCustomerUseCase } from '../../application/ports/queries/IGetCustomerUseCase';
import type { IListCustomersUseCase } from '../../application/ports/queries/IListCustomersUseCase';

export class CustomersController {
  constructor(
    private readonly registerCustomerUseCase: IRegisterCustomerUseCase,
    private readonly updateCustomerUseCase:   IUpdateCustomerUseCase,
    private readonly deleteCustomerUseCase:   IDeleteCustomerUseCase,
    private readonly grantVipUseCase:         IGrantVipUseCase,
    private readonly getCustomerUseCase:      IGetCustomerUseCase,
    private readonly listCustomersUseCase:    IListCustomersUseCase,
  ) {}

  async registerCustomer(req: Request, res: Response): Promise<void> {
    const body   = parseOrThrow(RegisterCustomerBodySchema, req.body, 'RegisterCustomer');
    const result = await this.registerCustomerUseCase.execute({ name: body.name, email: body.email });
    respond.created(res, result);
  }

  async updateCustomer(req: Request, res: Response): Promise<void> {
    const body   = parseOrThrow(UpdateCustomerBodySchema, req.body, 'UpdateCustomer');
    const result = await this.updateCustomerUseCase.execute({ customerId: req.params.id, ...body });
    respond.ok(res, result);
  }

  async deleteCustomer(req: Request, res: Response): Promise<void> {
    await this.deleteCustomerUseCase.execute({ customerId: req.params.id });
    respond.noContent(res);
  }

  async getCustomer(req: Request, res: Response): Promise<void> {
    const result = await this.getCustomerUseCase.execute({ customerId: req.params.id });
    respond.ok(res, result);
  }

  async listCustomers(_req: Request, res: Response): Promise<void> {
    const result = await this.listCustomersUseCase.execute();
    respond.ok(res, result);
  }

  async grantVip(req: Request, res: Response): Promise<void> {
    const result = await this.grantVipUseCase.execute({ customerId: req.params.id });
    respond.ok(res, result);
  }
}
