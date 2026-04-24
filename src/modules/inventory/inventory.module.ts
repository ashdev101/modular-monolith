import { Application } from 'express';
import type { DatabasePool } from '../../core/database/pool';
import type { IEventBus } from '../../core/bus/EventBus';
import type { IStockReader } from '../../core/interfaces/inventory/IStockReader';
import type { IStockAvailabilityChecker } from '../../core/interfaces/inventory/IStockAvailabilityChecker';
import { Events } from '../../core/events/registry';
import { StockRepository } from './infrastructure/persistence/StockRepository';
import { LocalInventoryService } from './infrastructure/acl/LocalInventoryService';
import { InventoryController } from './infrastructure/http/inventory.controller';
import { OnOrderCreated } from './events/handlers/OnOrderCreated';
import { OnOrderCancelled } from './events/handlers/OnOrderCancelled';
import { AddProductHandler } from './application/commands/AddProduct';
import { GetStockHandler } from './application/queries/GetStock';
import { ListProductsHandler } from './application/queries/ListProducts';

export class InventoryModule {
  // Expose narrow role interfaces separately.
  // A future catalogue/display module might only receive stockReader.
  // Only orders (which gates on availability) receives both.
  readonly stockReader:  IStockReader;
  readonly stockChecker: IStockAvailabilityChecker;

  private readonly repo:       StockRepository;
  private readonly controller: InventoryController;

  constructor(pool: DatabasePool, private readonly eventBus: IEventBus) {
    this.repo = new StockRepository(pool);

    const acl          = new LocalInventoryService(this.repo);
    this.stockReader   = acl;
    this.stockChecker  = acl;

    const addProduct   = new AddProductHandler(this.repo);
    const getStock     = new GetStockHandler(this.repo);
    const listProducts = new ListProductsHandler(this.repo);

    this.controller = new InventoryController(addProduct, getStock, listProducts);
  }

  register(app: Application): void {
    app.post('/inventory',    this.controller.addProduct.bind(this.controller));
    app.get('/inventory',     this.controller.listProducts.bind(this.controller));
    app.get('/inventory/:id', this.controller.getStock.bind(this.controller));

    this.eventBus.subscribe(Events.orders.CREATED,   new OnOrderCreated(this.repo, this.eventBus));
    this.eventBus.subscribe(Events.orders.CANCELLED, new OnOrderCancelled(this.repo, this.eventBus));

    console.log('[InventoryModule] ✅ Routes + event subscriptions registered');
  }
}
