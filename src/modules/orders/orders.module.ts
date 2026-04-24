import { Application } from 'express';
import type { DatabasePool } from '../../core/database/pool';
import type { IEventBus } from '../../core/bus/EventBus';
import type { ICustomerReader } from '../../core/interfaces/customers/ICustomerReader';
import type { IStockReader } from '../../core/interfaces/inventory/IStockReader';
import type { IStockAvailabilityChecker } from '../../core/interfaces/inventory/IStockAvailabilityChecker';
import type { IDiscountApplier } from '../../core/interfaces/discounts/IDiscountApplier';
import { OrderRepository } from './infrastructure/persistence/OrderRepository';
import { OrdersController } from './infrastructure/http/orders.controller';
import { PricingService } from './domain/services/PricingService';
import { CreateOrderHandler } from './application/commands/CreateOrder';
import { CancelOrderHandler } from './application/commands/CancelOrder';
import { GetOrderDetailHandler } from './application/queries/GetOrderDetail';
import { GetOrdersByCustomerHandler } from './application/queries/GetOrdersByCustomer';

// ─────────────────────────────────────────────────────────────────────────────
// OrdersModule — composition root for the orders bounded context.
//
// Cross-module dependencies are narrow role interfaces, not fat service contracts.
// Each parameter documents exactly what orders needs from that module:
//
//   ICustomerReader         — fetch customer data (getCustomer only)
//   IStockReader            — fetch product data  (getStock only)
//   IStockAvailabilityChecker — gate on stock     (checkAvailability only)
//   IDiscountApplier        — apply discount      (validateAndApply only)
//
// Phase 3 swap: pass HttpCustomerReader, HttpStockReader, etc.
// Each HTTP adapter implements one interface — one method — minimal surface.
// ─────────────────────────────────────────────────────────────────────────────

export class OrdersModule {
  constructor(
    private readonly pool:            DatabasePool,
    private readonly eventBus:        IEventBus,
    private readonly customerReader:  ICustomerReader,
    private readonly stockReader:     IStockReader,
    private readonly stockChecker:    IStockAvailabilityChecker,
    private readonly discountApplier: IDiscountApplier,
  ) {}

  register(app: Application): void {
    const orderRepo      = new OrderRepository(this.pool);
    const pricingService = new PricingService();

    const createOrder = new CreateOrderHandler(
      orderRepo,
      this.customerReader,
      this.stockReader,
      this.stockChecker,
      this.discountApplier,
      pricingService,
      this.eventBus,
    );
    const cancelOrder         = new CancelOrderHandler(orderRepo, this.eventBus);
    const getOrderDetail      = new GetOrderDetailHandler(this.pool);
    const getOrdersByCustomer = new GetOrdersByCustomerHandler(this.pool);

    const controller = new OrdersController(createOrder, cancelOrder, getOrderDetail, getOrdersByCustomer);

    app.post('/orders',       controller.createOrder.bind(controller));
    app.delete('/orders/:id', controller.cancelOrder.bind(controller));
    app.get('/orders/:id',    controller.getOrderDetail.bind(controller));
    app.get('/orders',        controller.getOrdersByCustomer.bind(controller));

    console.log('[OrdersModule] ✅ Routes registered');
  }
}
