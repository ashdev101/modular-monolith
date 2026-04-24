import type { IEventHandler } from '../../../../core/bus/EventBus';
import type { IEventBus } from '../../../../core/bus/EventBus';
import type { EventEnvelope } from '../../../../core/events/envelope';
import { Events } from '../../../../core/events/registry';
import { publishEvent } from '../../../../core/events/catalog';
// Import through our consumed/ folder — the anti-corruption layer.
// If orders changes their event shape, we update consumed/OrderCreated.v*.ts
// and this handler in isolation. Nothing else in inventory needs to change.
import type { OrderCreated, OrderCreatedV1 } from '../consumed/OrderCreated.v2';
import { upcastOrderCreatedV1toV2 as upcastV1toV2 } from '../consumed/OrderCreated.v2';
import type { StockRepository } from '../../infrastructure/persistence/StockRepository';
import { Stock } from '../../domain/Stock';

// ─────────────────────────────────────────────────────────────────────────────
// OnOrderCreated — inventory reacts to orders.order.created.
//
// Rule 3 in action:
//   - This file does NOT import anything from orders/
//   - It only knows about the EVENT SHAPE (from core/events/versions/)
//   - The decrement happens here, independently, after the event arrives
//
// If orders and inventory move to separate services, this handler
// subscribes to a Kafka topic instead of an in-memory bus.
// The handler logic is identical.
// ─────────────────────────────────────────────────────────────────────────────

export class OnOrderCreated implements IEventHandler<OrderCreatedV1 | OrderCreated> {
  constructor(
    private readonly stockRepo: StockRepository,
    private readonly eventBus:  IEventBus,
  ) {}

  async handle(envelope: EventEnvelope<OrderCreatedV1 | OrderCreated>): Promise<void> {
    // ── Schema version routing — handle both v1 and v2 consumers ─────────────
    let payload: OrderCreated;

    switch (envelope.schemaVersion) {
      case 1:
        // Upcast v1 → v2 so the rest of this handler only deals with v2
        payload = upcastV1toV2(envelope.payload as OrderCreatedV1);
        break;
      case 2:
        payload = envelope.payload as OrderCreated;
        break;
      default:
        console.warn(
          `[OnOrderCreated] Unknown schema version ${envelope.schemaVersion} — skipping`
        );
        return;
    }

    console.log(
      `[OnOrderCreated] Decrementing stock: productId=${payload.productId}` +
      ` qty=${payload.quantity} (orderId=${payload.orderId})`
    );

    const stock = await this.stockRepo.findByIdOrThrow(payload.productId);

    // Domain enforces the decrement rules — throws InsufficientStockError if violated
    const result = stock.decrement(payload.quantity);

    await this.stockRepo.update(stock);

    console.log(
      `[OnOrderCreated] Stock updated: ${payload.productId} now has ${stock.quantity} units`
    );

    // ── Publish downstream events based on the new stock level ───────────────
    //    Inventory publishes its own events — orders is not aware of these.

    if (result.isDepleted) {
      await publishEvent(this.eventBus, Events.inventory.STOCK_DEPLETED, {
        correlationId: envelope.correlationId,
        causationId:   envelope.eventId,
        payload: {
          productId:   payload.productId,
          productName: stock.productName,
          orderId:     payload.orderId,
        },
      });
    } else if (result.isLow) {
      await publishEvent(this.eventBus, Events.inventory.STOCK_LOW, {
        correlationId: envelope.correlationId,
        causationId:   envelope.eventId,
        payload: {
          productId:         payload.productId,
          productName:       stock.productName,
          remainingQuantity: stock.quantity,
          threshold:         Stock.LOW_STOCK_THRESHOLD,
        },
      });
    }
  }
}
