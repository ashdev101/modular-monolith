import { Request, Response } from 'express';
import { DomainError, NotFoundError, ValidationError } from '../../../../core/errors';
import { parseOrThrow } from '../../../../core/schemas/parseOrThrow';
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
//
// Every dependency is an interface. Swap any handler (HTTP client, etc.)
// in orders.module.ts — this file never changes.
// ─────────────────────────────────────────────────────────────────────────────

export class OrdersController {
  constructor(
    private readonly createOrderUseCase:         ICreateOrderUseCase,
    private readonly cancelOrderUseCase:         ICancelOrderUseCase,
    private readonly getOrderDetailUseCase:      IGetOrderDetailUseCase,
    private readonly getOrdersByCustomerUseCase: IGetOrdersByCustomerUseCase,
  ) {}

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const body          = parseOrThrow(CreateOrderBodySchema, req.body, 'CreateOrder');
      const correlationId = req.headers['x-correlation-id'] as string | undefined;
      const result        = await this.createOrderUseCase.execute(
        new CreateOrderCommand(body.customerId, body.items, body.discountCode, correlationId),
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const body          = parseOrThrow(CancelOrderBodySchema, req.body, 'CancelOrder');
      const correlationId = req.headers['x-correlation-id'] as string | undefined;
      const result        = await this.cancelOrderUseCase.execute(
        new CancelOrderCommand(req.params.id, body.reason ?? 'No reason provided', correlationId),
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  async getOrderDetail(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getOrderDetailUseCase.execute(
        new GetOrderDetailQuery(req.params.id, req.headers['x-correlation-id'] as string),
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  async getOrdersByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.query['customerId'] as string;
      if (!customerId) {
        res.status(400).json({ success: false, error: 'customerId query param is required' });
        return;
      }
      const result = await this.getOrdersByCustomerUseCase.execute(new GetOrdersByCustomerQuery(customerId));
      res.status(200).json({ success: true, data: result });
    } catch (err) { this.handleError(err, res); }
  }

  private handleError(err: unknown, res: Response): void {
    if (err instanceof NotFoundError)   { res.status(404).json({ success: false, error: err.message }); return; }
    if (err instanceof ValidationError) { res.status(400).json({ success: false, error: err.message }); return; }
    if (err instanceof DomainError)     { res.status(422).json({ success: false, error: err.message }); return; }
    console.error('[OrdersController] Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
