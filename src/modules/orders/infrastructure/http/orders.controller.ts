import type { Request, Response } from 'express';
import { ValidationError } from '../../../../core/errors';
import { parseOrThrow } from '../../../../core/schemas/parseOrThrow';
import { respond } from '../../../../core/http/respond';
import { CreateOrderBodySchema, CancelOrderBodySchema } from './orders.schemas';
import { CreateOrderCommand } from '../../application/ports/commands/ICreateOrderUseCase';
import { CancelOrderCommand } from '../../application/ports/commands/ICancelOrderUseCase';
import { GetOrderDetailQuery } from '../../application/ports/queries/IGetOrderDetailUseCase';
import { GetOrdersByCustomerQuery } from '../../application/ports/queries/IGetOrdersByCustomerUseCase';
import type { ICreateOrderUseCase } from '../../application/ports/commands/ICreateOrderUseCase';
import type { ICancelOrderUseCase } from '../../application/ports/commands/ICancelOrderUseCase';
import type { IGetOrderDetailUseCase } from '../../application/ports/queries/IGetOrderDetailUseCase';
import type { IGetOrdersByCustomerUseCase } from '../../application/ports/queries/IGetOrdersByCustomerUseCase';

// ─────────────────────────────────────────────────────────────────────────────
// OrdersController — HTTP in → use-case call → HTTP out. Nothing more.
// Errors propagate via asyncHandler → errorMiddleware. No try/catch needed.
// ─────────────────────────────────────────────────────────────────────────────

export class OrdersController {
  constructor(
    private readonly createOrderUseCase:         ICreateOrderUseCase,
    private readonly cancelOrderUseCase:         ICancelOrderUseCase,
    private readonly getOrderDetailUseCase:      IGetOrderDetailUseCase,
    private readonly getOrdersByCustomerUseCase: IGetOrdersByCustomerUseCase,
  ) {}

  async createOrder(req: Request, res: Response): Promise<void> {
    const body          = parseOrThrow(CreateOrderBodySchema, req.body, 'CreateOrder');
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    const result        = await this.createOrderUseCase.execute(
      new CreateOrderCommand(body.customerId, body.items, body.discountCode, correlationId),
    );
    respond.created(res, result);
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    const body          = parseOrThrow(CancelOrderBodySchema, req.body, 'CancelOrder');
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    const result        = await this.cancelOrderUseCase.execute(
      new CancelOrderCommand(req.params.id, body.reason ?? 'No reason provided', correlationId),
    );
    respond.ok(res, result);
  }

  async getOrderDetail(req: Request, res: Response): Promise<void> {
    const result = await this.getOrderDetailUseCase.execute(
      new GetOrderDetailQuery(req.params.id, req.headers['x-correlation-id'] as string),
    );
    respond.ok(res, result);
  }

  async getOrdersByCustomer(req: Request, res: Response): Promise<void> {
    const customerId = req.query['customerId'] as string | undefined;
    if (!customerId) throw new ValidationError('customerId query param is required');
    const result = await this.getOrdersByCustomerUseCase.execute(new GetOrdersByCustomerQuery(customerId));
    respond.ok(res, result);
  }
}
