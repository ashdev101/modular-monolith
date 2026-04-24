import { v4 as uuidv4 } from 'uuid';
import type { ICreateOrderUseCase, CreateOrderCommand, CreateOrderResult } from '../ports/commands/ICreateOrderUseCase';
import type { IEventBus } from '../../../../core/bus/EventBus';
import type { ICustomerReader } from '../../../../core/interfaces/customers/ICustomerReader';
import type { IStockReader } from '../../../../core/interfaces/inventory/IStockReader';
import type { IStockAvailabilityChecker } from '../../../../core/interfaces/inventory/IStockAvailabilityChecker';
import type { IDiscountApplier } from '../../../../core/interfaces/discounts/IDiscountApplier';
import { Events } from '../../../../core/events/registry';
import { publishEvent } from '../../../../core/events/catalog';
import { ValidationError, InsufficientStockError } from '../../../../core/errors';
import type { OrderRepository } from '../../infrastructure/persistence/OrderRepository';
import { Order } from '../../domain/Order';
import { OrderItem } from '../../domain/OrderItem';
import { Money } from '../../domain/Money';
import { PricingService } from '../../domain/services/PricingService';

// ─────────────────────────────────────────────────────────────────────────────
// CreateOrderHandler
//
// Each cross-module dependency is declared as a narrow role interface:
//
//   ICustomerReader         — only getCustomer() is needed here.
//                             A future HttpCustomerReader implements this one
//                             method. It does not need customerExists(), no stub.
//
//   IStockReader            — only getStock() to fetch price + product name.
//   IStockAvailabilityChecker — only checkAvailability() to gate the order.
//                             Deliberately separate: a reservation service might
//                             only need the check, never the full product data.
//
//   IDiscountApplier        — only validateAndApply(). The read-only getDiscount()
//                             is not our concern. This also documents that orders
//                             is the only module allowed to mutate discount state.
// ─────────────────────────────────────────────────────────────────────────────

export class CreateOrderHandler implements ICreateOrderUseCase {
  constructor(
    private readonly orderRepo:       OrderRepository,
    private readonly customerReader:  ICustomerReader,
    private readonly stockReader:     IStockReader,
    private readonly stockChecker:    IStockAvailabilityChecker,
    private readonly discountApplier: IDiscountApplier,
    private readonly pricingService:  PricingService,
    private readonly eventBus:        IEventBus,
  ) {}

  async execute(cmd: CreateOrderCommand): Promise<CreateOrderResult> {
    if (!cmd.customerId) throw new ValidationError('customerId is required');
    if (!cmd.items || cmd.items.length === 0) throw new ValidationError('At least one item is required');
    if (cmd.items.length > 1) throw new ValidationError('This version supports exactly one product per order');

    const lineItem = cmd.items[0];

    // Fetch cross-domain data in parallel — each via its narrow role interface
    const [customer, stockInfo] = await Promise.all([
      this.customerReader.getCustomer(cmd.customerId),
      this.stockReader.getStock(lineItem.productId),
    ]);

    console.log(
      `[CreateOrderHandler] Customer: ${customer.name} (VIP=${customer.isVip})` +
      ` | Product: ${stockInfo.productName} @ ${stockInfo.unitPrice}¢ x ${lineItem.quantity}`
    );

    const isAvailable = await this.stockChecker.checkAvailability(lineItem.productId, lineItem.quantity);
    if (!isAvailable) throw new InsufficientStockError(lineItem.productId, lineItem.quantity, stockInfo.availableQty);

    // Generate the order ID before calling validateAndApply so the discount
    // service can use it as an idempotency key (preventing double-application
    // if the request is retried after the discount is already applied).
    const orderId = uuidv4();

    const discountDTO = cmd.discountCode
      ? await this.discountApplier.validateAndApply(cmd.discountCode, orderId)
      : null;
    const discountPct = discountDTO?.percentage ?? 0;

    const orderItem = new OrderItem(stockInfo.productId, stockInfo.productName, lineItem.quantity, Money.ofCents(stockInfo.unitPrice));
    const pricing   = this.pricingService.calculate([orderItem], customer.isVip, discountPct);

    console.log(
      `[CreateOrderHandler] Pricing: subtotal=${pricing.subtotal}, ` +
      `discount=${pricing.discountAmt} (${pricing.discountPct.toFixed(1)}%), ` +
      `total=${pricing.total}, VIP bonus applied=${pricing.appliedVip}`
    );

    const order = Order.create({
      id:           orderId,
      customerId:   cmd.customerId,
      items:        [orderItem],
      total:        pricing.total,
      discountCode: cmd.discountCode ?? null,
      discountPct:  pricing.discountPct,
    });

    await this.orderRepo.save(order);

    await publishEvent(this.eventBus, Events.orders.CREATED, {
      correlationId: cmd.correlationId,
      causationId:   cmd.causationId,
      payload: {
        orderId:     order.id,
        customerId:  order.customerId,
        productId:   lineItem.productId,
        quantity:    lineItem.quantity,
        total:       pricing.total.amount,
        currency:    pricing.total.currency,
        discountPct: pricing.discountPct,
      },
    });

    return {
      orderId:     order.id,
      total:       order.total.amount,
      currency:    order.currency,
      discountPct: order.discountPct,
      status:      order.status,
    };
  }
}
