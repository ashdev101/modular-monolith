import type { ICancelOrderUseCase, CancelOrderCommand, CancelOrderResult } from '../ports/commands/ICancelOrderUseCase';
import type { IEventBus } from '../../../../core/bus/EventBus';
import { Events } from '../../../../core/events/registry';
import { publishEvent } from '../../../../core/events/catalog';
import type { OrderRepository } from '../../infrastructure/persistence/OrderRepository';

// ─────────────────────────────────────────────────────────────────────────────
// CancelOrderHandler
//
// Does NOT restore inventory directly — fires OrderCancelled event.
// Inventory reacts independently. Orders never touches inventory.* schema.
// ─────────────────────────────────────────────────────────────────────────────

export class CancelOrderHandler implements ICancelOrderUseCase {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly eventBus:  IEventBus,
  ) {}

  async execute(cmd: CancelOrderCommand): Promise<CancelOrderResult> {
    const order = await this.orderRepo.findByIdOrThrow(cmd.orderId);
    order.cancel();
    await this.orderRepo.update(order);

    await publishEvent(this.eventBus, Events.orders.CANCELLED, {
      correlationId: cmd.correlationId,
      causationId:   cmd.causationId,
      payload: {
        orderId:    order.id,
        customerId: order.customerId,
        productId:  order.primaryItem.productId,
        quantity:   order.primaryItem.quantity,
        reason:     cmd.reason,
      },
    });

    return { orderId: order.id, status: order.status };
  }
}
