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
//   ICustomerReader           — fetch customer data (getCustomer only)
//   IStockReader              — fetch product data  (getStock only)
//   IStockAvailabilityChecker — gate on stock       (checkAvailability only)
//   IDiscountApplier          — apply discount      (validateAndApply only)
//
// Phase 3 swap: pass HttpCustomerReader, HttpStockReader, etc.
// Each HTTP adapter implements one interface — one method — minimal surface.
// ─────────────────────────────────────────────────────────────────────────────

export class OrdersModule {
  private readonly controller: OrdersController;

  constructor(
    pool:                       DatabasePool,
    eventBus:                   IEventBus,
    customerReader:             ICustomerReader,
    stockReader:                IStockReader,
    stockChecker:               IStockAvailabilityChecker,
    discountApplier:            IDiscountApplier,
  ) {
    const orderRepo      = new OrderRepository(pool);
    const pricingService = new PricingService();

    const createOrder = new CreateOrderHandler(
      orderRepo,
      customerReader,
      stockReader,
      stockChecker,
      discountApplier,
      pricingService,
      eventBus,
    );
    const cancelOrder         = new CancelOrderHandler(orderRepo, eventBus);
    const getOrderDetail      = new GetOrderDetailHandler(pool);
    const getOrdersByCustomer = new GetOrdersByCustomerHandler(pool);

    this.controller = new OrdersController(createOrder, cancelOrder, getOrderDetail, getOrdersByCustomer);
  }

  register(app: Application): void {
    app.post('/orders',       this.controller.createOrder.bind(this.controller));
    app.delete('/orders/:id', this.controller.cancelOrder.bind(this.controller));
    app.get('/orders/:id',    this.controller.getOrderDetail.bind(this.controller));
    app.get('/orders',        this.controller.getOrdersByCustomer.bind(this.controller));

    console.log('[OrdersModule] ✅ Routes registered');
  }
}
