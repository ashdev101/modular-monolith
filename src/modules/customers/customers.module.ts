import { Application } from 'express';
import type { DatabasePool } from '../../core/database/pool';
import type { IEventBus } from '../../core/bus/EventBus';
import type { ICustomerReader } from '../../core/interfaces/customers/ICustomerReader';
import type { ICustomerValidator } from '../../core/interfaces/customers/ICustomerValidator';
import { CustomerRepository } from './infrastructure/persistence/CustomerRepository';
import { LocalCustomerService } from './infrastructure/acl/LocalCustomerService';
import { CustomersController } from './infrastructure/http/customers.controller';
import { RegisterCustomerHandler } from './application/commands/RegisterCustomer';
import { GrantVipHandler } from './application/commands/GrantVip';
import { GetCustomerHandler } from './application/queries/GetCustomer';
import { ListCustomersHandler } from './application/queries/ListCustomers';

export class CustomersModule {
  // Expose narrow role interfaces — consuming modules declare only what they need.
  // OrdersModule takes customerReader; a future audit module might take customerValidator.
  // Neither ever sees LocalCustomerService or CustomerRepository.
  readonly customerReader:    ICustomerReader;
  readonly customerValidator: ICustomerValidator;

  private readonly repo:       CustomerRepository;
  private readonly controller: CustomersController;

  constructor(pool: DatabasePool, eventBus: IEventBus) {
    this.repo = new CustomerRepository(pool);

    const acl              = new LocalCustomerService(this.repo);
    this.customerReader    = acl;
    this.customerValidator = acl;

    const registerCustomer = new RegisterCustomerHandler(this.repo, eventBus);
    const grantVip         = new GrantVipHandler(this.repo, eventBus);
    const getCustomer      = new GetCustomerHandler(this.repo);
    const listCustomers    = new ListCustomersHandler(this.repo);

    this.controller = new CustomersController(registerCustomer, grantVip, getCustomer, listCustomers);
  }

  register(app: Application): void {
    app.post('/customers',         this.controller.registerCustomer.bind(this.controller));
    app.get('/customers',          this.controller.listCustomers.bind(this.controller));
    app.get('/customers/:id',      this.controller.getCustomer.bind(this.controller));
    app.post('/customers/:id/vip', this.controller.grantVip.bind(this.controller));
    console.log('[CustomersModule] ✅ Routes registered');
  }
}
