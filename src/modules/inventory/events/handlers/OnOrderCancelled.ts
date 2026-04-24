import type { IEventHandler } from '../../../../core/bus/EventBus';
import type { IEventBus } from '../../../../core/bus/EventBus';
import type { EventEnvelope } from '../../../../core/events/envelope';
import { Events } from '../../../../core/events/registry';
import { publishEvent } from '../../../../core/events/catalog';
import type { OrderCancelled } from '../consumed/OrderCancelled.v1';
import type { StockRepository } from '../../infrastructure/persistence/StockRepository';

// ─────────────────────────────────────────────────────────────────────────────
// OnOrderCancelled — restores stock when an order is cancelled.
//
// The orders module published OrderCancelled and forgot about it.
// Inventory picks it up here — independently, cleanly, with no direct coupling.
// ─────────────────────────────────────────────────────────────────────────────

export class OnOrderCancelled implements IEventHandler<OrderCancelled> {
  constructor(
    private readonly stockRepo: StockRepository,
    private readonly eventBus:  IEventBus,
  ) {}

  async handle(envelope: EventEnvelope<OrderCancelled>): Promise<void> {
    const { productId, quantity, orderId } = envelope.payload;

    console.log(
      `[OnOrderCancelled] Restoring stock: productId=${productId}` +
      ` qty=${quantity} (orderId=${orderId})`
    );

    const stock = await this.stockRepo.findByIdOrThrow(productId);
    stock.restore(quantity);
    await this.stockRepo.update(stock);

    console.log(
      `[OnOrderCancelled] Stock restored: ${productId} now has ${stock.quantity} units`
    );

    await publishEvent(this.eventBus, Events.inventory.STOCK_RESTORED, {
      correlationId: envelope.correlationId,
      causationId:   envelope.eventId,
      payload: {
        productId,
        restoredQty: quantity,
        newTotalQty: stock.quantity,
        reason:      `Order ${orderId} cancelled`,
      },
    });
  }
}
