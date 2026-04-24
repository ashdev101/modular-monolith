import { Application } from 'express';
import type { DatabasePool } from '../../core/database/pool';
import type { IDiscountReader } from '../../core/interfaces/discounts/IDiscountReader';
import type { IDiscountApplier } from '../../core/interfaces/discounts/IDiscountApplier';
import { DiscountRepository } from './infrastructure/persistence/DiscountRepository';
import { LocalDiscountService } from './infrastructure/acl/LocalDiscountService';
import { DiscountsController } from './infrastructure/http/discounts.controller';
import { CreateDiscountHandler } from './application/commands/CreateDiscount';
import { GetDiscountHandler } from './application/queries/GetDiscount';

export class DiscountsModule {
  // discountApplier is intentionally a separate capability from discountReader.
  // Applying a discount mutates state (increments usage count).
  // A read-only reporting module must never receive discountApplier.
  readonly discountReader:  IDiscountReader;
  readonly discountApplier: IDiscountApplier;

  private readonly repo:       DiscountRepository;
  private readonly controller: DiscountsController;

  constructor(pool: DatabasePool) {
    this.repo = new DiscountRepository(pool);

    const acl              = new LocalDiscountService(this.repo);
    this.discountReader    = acl;
    this.discountApplier   = acl;

    const createDiscount = new CreateDiscountHandler(this.repo);
    const getDiscount    = new GetDiscountHandler(this.repo);

    this.controller = new DiscountsController(createDiscount, getDiscount);
  }

  register(app: Application): void {
    app.post('/discounts',      this.controller.createDiscount.bind(this.controller));
    app.get('/discounts/:code', this.controller.getDiscount.bind(this.controller));
    console.log('[DiscountsModule] ✅ Routes registered');
  }
}
