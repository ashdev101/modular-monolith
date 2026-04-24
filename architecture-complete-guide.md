# Modular Monolith → Microservices: Complete Architecture Guide

> Everything in one place — structure, rules, events, domains, cross-domain calls,
> service interfaces, and the full migration path with examples.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [The 3 Rules](#2-the-3-rules)
3. [The Layer Model](#3-the-layer-model)
4. [Domain Layer](#4-domain-layer)
5. [Cross-Domain Calls](#5-cross-domain-calls)
6. [Service Layer — Why We Don't Have One](#6-service-layer--why-we-dont-have-one)
7. [Event Bus — Why You Need It in a Monolith](#7-event-bus--why-you-need-it-in-a-monolith)
8. [Managing Events at Scale](#8-managing-events-at-scale)
9. [Schema Evolution](#9-schema-evolution)
10. [Cross-Module Queries and JOINs](#10-cross-module-queries-and-joins)
11. [Migration Plan — Phase by Phase](#11-migration-plan--phase-by-phase)
12. [Phase 2 Completion Checklist](#12-phase-2-completion-checklist)
13. [Quick Reference](#13-quick-reference)

---

## 1. Project Structure

This is the complete folder structure you build once and carry all the way to microservices.

```
src/
├── core/
│   ├── interfaces/
│   │   ├── ICustomerService.ts       ← contract — not implementation
│   │   ├── IDiscountService.ts
│   │   ├── IInventoryService.ts
│   │   └── DTOs/
│   │       ├── CustomerDTO.ts        ← plain data, no domain objects
│   │       ├── DiscountDTO.ts
│   │       └── StockDTO.ts
│   ├── bus/
│   │   ├── CommandBus.ts             ← routes commands to handlers
│   │   ├── QueryBus.ts               ← routes queries to handlers
│   │   └── EventBus.ts               ← InMemoryEventBus today, Kafka tomorrow
│   ├── events/
│   │   ├── registry.ts               ← ALL event name constants
│   │   ├── envelope.ts               ← EventEnvelope<T> — standard shell
│   │   └── versions/                 ← versioned event payloads
│   │       ├── orders.created.v1.ts
│   │       └── orders.created.v2.ts
│   ├── database/
│   │   └── Database.ts               ← single DB, transaction wrapper
│   └── errors/
│       └── index.ts                  ← DomainError, NotFoundError, etc.
│
├── modules/
│   ├── orders/
│   │   ├── domain/
│   │   │   ├── Order.ts              ← aggregate root
│   │   │   ├── OrderItem.ts          ← value object
│   │   │   ├── Money.ts              ← value object
│   │   │   └── services/
│   │   │       └── PricingService.ts ← domain service, pure logic
│   │   ├── commands/
│   │   │   ├── CreateOrder.ts        ← command + handler
│   │   │   └── CancelOrder.ts
│   │   ├── queries/
│   │   │   └── GetOrderDetail.ts     ← cross-schema JOIN lives here
│   │   ├── events/
│   │   │   ├── published/            ← orders team owns these
│   │   │   │   ├── OrderCreated.v1.ts
│   │   │   │   └── OrderCreated.v2.ts
│   │   │   └── consumed/             ← read-only copies from other teams
│   │   │       └── UserRegistered.v1.ts
│   │   ├── infra/
│   │   │   ├── OrderRepository.ts    ← only touches orders.* schema
│   │   │   └── orders.controller.ts  ← HTTP layer, thin as possible
│   │   └── orders.module.ts          ← wires everything together
│   │
│   ├── customers/
│   │   ├── domain/
│   │   │   └── Customer.ts
│   │   ├── infra/
│   │   │   ├── CustomerRepository.ts
│   │   │   └── LocalCustomerService.ts ← implements ICustomerService via DB
│   │   └── customers.module.ts
│   │
│   ├── inventory/
│   │   ├── domain/
│   │   │   └── Stock.ts
│   │   ├── infra/
│   │   │   ├── StockRepository.ts
│   │   │   └── LocalInventoryService.ts
│   │   ├── events/
│   │   │   └── handlers/
│   │   │       └── OnOrderCreated.ts  ← reacts to order events
│   │   └── inventory.module.ts
│   │
│   └── discounts/
│       ├── domain/
│       │   └── DiscountCode.ts
│       ├── infra/
│       │   ├── DiscountRepository.ts
│       │   └── LocalDiscountService.ts
│       └── discounts.module.ts
```

---

## 2. The 3 Rules

These rules are what make the migration possible later. Break them and the architecture falls apart.

### Rule 1 — Commands Stay in Their Own Schema

A command handler only writes to its own module's DB schema. It never directly touches another module's data. It fires an event and moves on.

```typescript
// ✅ CORRECT — CreateOrderHandler only touches orders.*
class CreateOrderHandler {
  async execute(cmd: CreateOrderCommand) {
    const order = Order.create(cmd.items, cmd.customerId, total);
    await this.orderRepo.save(order);  // orders.* only

    await this.eventBus.publish({
      eventName:     Events.orders.CREATED,
      schemaVersion: 1,
      payload:       { orderId: order.id, productId: cmd.productId }
    });
    // Done — inventory reacts to the event on its own
  }
}

// ❌ WRONG — never do this
import { StockRepository } from '../../inventory/infra/StockRepository';

class CreateOrderHandler {
  async execute(cmd: CreateOrderCommand) {
    await this.orderRepo.save(order);
    await this.stockRepo.decrement(cmd.productId); // 💀 orders touching inventory
  }
}
```

### Rule 2 — Queries Can JOIN Freely Across Schemas

The read side is different. `GetOrderDetail` is allowed to JOIN across schemas because in the monolith there is one DB and this costs nothing. This is the monolith's superpower.

```typescript
// ✅ CORRECT — query handler does a direct cross-schema JOIN
class GetOrderDetailHandler {
  async execute(query: GetOrderDetailQuery) {
    return this.db.query(`
      SELECT
        o.id, o.status, o.total,
        u.name     AS customer_name,
        i.quantity AS stock_remaining
      FROM   orders.orders o
      JOIN   users.users u        ON u.id         = o.user_id
      JOIN   inventory.products i ON i.product_id = o.product_id
      WHERE  o.id = $1
    `, [query.orderId]);
  }
}
```

### Rule 3 — Modules Communicate Only Through Events

Inventory never imports OrderRepository, Order, or any orders internals. It only imports the event shape.

```typescript
// ✅ CORRECT — inventory reacts to an event, imports nothing from orders internals
import { OrderCreatedV1 } from '../../../core/events/versions/orders.created.v1';

class OnOrderCreatedHandler {
  async handle(event: EventEnvelope<OrderCreatedV1>) {
    await this.stockRepo.decrement(event.payload.productId, event.payload.quantity);
  }
}
```

---

## 3. The Layer Model

Every request flows through these layers in order. Each layer has one job.

```
HTTP Request
    ↓
Controller          → parse HTTP input only, call bus, return response
    ↓
CommandBus
    ↓
Handler             → orchestrate: fetch data, call domain, save, publish event
    ↓          ↓
  Domain    Repository
  (logic)    (DB only)
    ↓
EventBus
    ↓
Other module's Handler (reacts independently)
```

```typescript
// Controller — HTTP only, no logic
class OrdersController {
  async createOrder(req: Request, res: Response) {
    const cmd    = new CreateOrderCommand(req.body);   // parse
    const result = await this.commandBus.execute(cmd); // hand off
    res.status(201).json(result);                      // respond
  }
}

// Handler — orchestrates one use case
class CreateOrderHandler {
  async execute(cmd: CreateOrderCommand) {
    const customer = await this.customerService.getCustomer(cmd.customerId);
    const discount  = await this.discountService.getDiscount(cmd.discountCode);
    const total     = this.pricingService.calculate(cmd.items, customer.isVip, discount?.percentage ?? 0);
    const order     = Order.create(cmd.items, cmd.customerId, total);
    await this.orderRepo.save(order);
    await this.eventBus.publish({ eventName: Events.orders.CREATED, schemaVersion: 1, payload: { orderId: order.id } });
  }
}

// Domain — pure logic, no DB, no HTTP
class Order {
  static create(items: OrderItem[], customerId: string, total: Money): Order {
    if (items.length === 0) throw new DomainError('Order must have at least one item');
    return new Order(uuid(), customerId, items, total, 'pending');
  }

  cancel(): void {
    if (this.status === 'shipped') throw new DomainError('Cannot cancel a shipped order');
    this.status = 'cancelled';
  }
}

// Repository — DB only, no logic
class OrderRepository {
  async save(order: Order): Promise<void> {
    await this.db.query(
      'INSERT INTO orders.orders (id, customer_id, total, status) VALUES ($1, $2, $3, $4)',
      [order.id, order.customerId, order.total.amount, order.status]
    );
  }
}
```

---

## 4. Domain Layer

The domain folder is the heart of each module. It contains pure business logic — no DB, no HTTP, no imports from other modules.

### What Lives in domain/

```
orders/domain/
├── Order.ts              ← aggregate root — main entity, enforces business rules
├── OrderItem.ts          ← value object — immutable, no identity
├── Money.ts              ← value object — shared concept
└── services/
    └── PricingService.ts ← domain service — logic spanning multiple objects
                             within THIS module only, still pure
```

### Aggregate Root

```typescript
// orders/domain/Order.ts
export class Order {
  private constructor(
    public readonly id:         string,
    public readonly customerId: string,
    public readonly items:      OrderItem[],
    public readonly total:      Money,
    private status:             OrderStatus,
  ) {}

  // Factory — validates before creating
  static create(items: OrderItem[], customerId: string, total: Money): Order {
    if (items.length === 0) {
      throw new DomainError('Order must have at least one item');
    }
    return new Order(uuid(), customerId, items, total, 'pending');
  }

  // Business rule lives here — not in handler, not in controller
  cancel(): void {
    if (this.status === 'shipped') {
      throw new DomainError('Cannot cancel a shipped order');
    }
    this.status = 'cancelled';
  }

  get isPending(): boolean { return this.status === 'pending'; }
}
```

### Value Object

```typescript
// orders/domain/OrderItem.ts
export class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly quantity:  number,
    public readonly price:     Money,
  ) {
    if (quantity <= 0) throw new DomainError('Quantity must be positive');
  }

  get subtotal(): Money {
    return this.price.multiply(this.quantity);
  }
}
```

### Domain Service — For Logic Spanning Multiple Objects

```typescript
// orders/domain/services/PricingService.ts
// Pure calculation — no DB, no HTTP, completely testable with plain values
export class PricingService {
  calculate(
    items:       OrderItem[],
    isVip:       boolean,       // plain boolean — not a Customer object
    discountPct: number,        // plain number  — not a DiscountCode object
  ): Money {
    const base      = items.reduce((sum, i) => sum.add(i.subtotal), Money.zero());
    const eligible  = isVip && discountPct > 0;
    return eligible ? base.multiply(1 - discountPct) : base;
  }
}
```

### What Domain Objects Must Never Do

```typescript
// ❌ Never import from another module's domain
import { Customer } from '../../customers/domain/Customer'; // 💀

// ❌ Never make DB calls
class Order {
  async cancel() {
    await db.query('UPDATE orders SET status = ?'); // 💀
  }
}

// ❌ Never make HTTP calls
class Order {
  static async create() {
    const stock = await fetch('/inventory/check'); // 💀
  }
}
```

---

## 5. Cross-Domain Calls

Cross-domain calls are real and unavoidable. The architecture does not eliminate them — it controls **where** they happen.

### Option A — Logic on the Domain Object (Wrong)

```typescript
// ❌ Order takes a Customer object — cross-domain coupling inside domain
class Order {
  static create(items: OrderItem[], customer: Customer, discount: DiscountCode): Order {
    const isVip  = customer.isVip();             // Order now knows Customer internals
    const total  = discount ? base * 0.9 : base; // Order now knows DiscountCode internals
    return new Order(...);
  }
}

// Problem: Customer renames isVip() → hasPremiumStatus() and Order breaks
// Problem: You cannot test Order without building a full Customer object
// Problem: When extracting to microservices, Order depends on Customer existing
```

### Option B — Domain Service with Plain Data (Correct)

```typescript
// ✅ PricingService takes plain data — no domain objects from other modules
class PricingService {
  calculate(items: OrderItem[], isVip: boolean, discountPct: number): Money {
    const base     = items.reduce((sum, i) => sum.add(i.subtotal), Money.zero());
    const eligible = isVip && discountPct > 0;
    return eligible ? base.multiply(1 - discountPct) : base;
  }
}

// ✅ Order stays clean — only receives the result
class Order {
  static create(items: OrderItem[], customerId: string, total: Money): Order {
    return new Order(uuid(), customerId, items, total, 'pending');
  }
}

// ✅ Handler fetches cross-domain data and passes plain values down
class CreateOrderHandler {
  async execute(cmd: CreateOrderCommand) {
    // Cross-domain calls live HERE — in the handler, not in the domain
    const customer = await this.customerService.getCustomer(cmd.customerId);
    const discount  = await this.discountService.getDiscount(cmd.discountCode);

    // Pass plain values to domain — not domain objects
    const total = this.pricingService.calculate(
      cmd.items,
      customer.isVip,          // boolean — not Customer
      discount?.percentage ?? 0 // number  — not DiscountCode
    );

    const order = Order.create(cmd.items, cmd.customerId, total);
    await this.orderRepo.save(order);
  }
}
```

### Testing Shows the Difference

```typescript
// Option A — must build a full Customer to test Order
const customer = new Customer({ id: '1', tier: 'vip', joinedAt: new Date(), ... });
const order    = Order.create(items, customer, discount);

// Option B — test PricingService with plain values, no dependencies
const pricing = new PricingService();
const total   = pricing.calculate(
  [new OrderItem('p1', 2, new Money(100))],
  true,   // isVip — just a boolean
  0.1,    // discountPct — just a number
);
expect(total.amount).toBe(180);

// Order tested separately — completely isolated
const order = Order.create(items, 'customer-1', new Money(180));
expect(order.total.amount).toBe(180);
```

### The Rule

```
Logic that belongs to ONE thing    → method on that domain object
Logic that spans MULTIPLE things   → Domain Service with plain data params
Cross-domain FETCHING              → Handler only, never domain
```

---

## 6. Service Layer — Why We Don't Have One

Traditional architecture has a service layer between controller and repository. We replace it with something better.

```
Traditional:
  Controller → OrderService → Repository
  Problem: OrderService becomes a 800-line God class over time

Our Architecture:
  Controller → CommandBus → CreateOrderHandler → Domain + Repository
  Each handler is 30-50 lines. Single responsibility.
```

```typescript
// ❌ Classic God Service — seen in every large codebase
class OrderService {
  async createOrder() { ... }
  async cancelOrder() { ... }
  async getOrder() { ... }
  async getOrdersByUser() { ... }
  async updateOrderStatus() { ... }
  async applyDiscount() { ... }
  async processRefund() { ... }
  // 6 months later — 800 lines, nobody wants to touch it
}

// ✅ Each operation is its own focused file
commands/
├── CreateOrder.ts    // ~40 lines
├── CancelOrder.ts    // ~30 lines
└── ApplyDiscount.ts  // ~35 lines

queries/
├── GetOrderDetail.ts   // ~25 lines
└── GetOrdersByUser.ts  // ~25 lines
```

The handler IS the service method. It just has a better name, a smaller scope, and a single reason to exist.

---

## 7. Event Bus — Why You Need It in a Monolith

### Without EventBus — Teams Get Lazy

```typescript
// ❌ What happens without EventBus discipline
import { StockRepository } from '../../inventory/infra/StockRepository';

class CreateOrderHandler {
  async execute(cmd: CreateOrderCommand) {
    await this.orderRepo.save(order);
    await this.stockRepo.decrement(cmd.productId); // orders knows inventory
  }
}

// Now orders and inventory are secretly coupled
// Extracting inventory later becomes a major refactor
```

### With EventBus — Boundaries Stay Real

```typescript
// ✅ Orders fires and forgets
class CreateOrderHandler {
  async execute(cmd: CreateOrderCommand) {
    await this.orderRepo.save(order);
    await this.eventBus.publish({
      eventName:     Events.orders.CREATED,
      schemaVersion: 1,
      payload:       { orderId: order.id, productId: cmd.productId }
    });
    // Orders does not know inventory exists
  }
}

// ✅ Inventory reacts independently
class OnOrderCreatedHandler {
  async handle(event: EventEnvelope<OrderCreatedV1>) {
    await this.stockRepo.decrement(event.payload.productId, event.payload.quantity);
    // Inventory does not know orders internals
  }
}
```

### InMemoryEventBus Implementation

```typescript
// core/bus/EventBus.ts
export interface IEventBus {
  publish(envelope: EventEnvelope): Promise<void>;
  subscribe(eventName: string, handler: IEventHandler): void;
}

export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, IEventHandler[]>();

  subscribe(eventName: string, handler: IEventHandler) {
    const existing = this.handlers.get(eventName) ?? [];
    this.handlers.set(eventName, [...existing, handler]);
  }

  async publish(envelope: EventEnvelope) {
    const handlers = this.handlers.get(envelope.eventName) ?? [];
    await Promise.all(handlers.map(h => h.handle(envelope)));
  }
}
```

No Kafka, no broker, no infra. Same interface you will swap later.

### Module Registration on Startup

```typescript
// main.ts — subscribe handlers when app boots
const eventBus = new InMemoryEventBus();

// Inventory subscribes to order events
eventBus.subscribe(
  Events.orders.CREATED,
  new OnOrderCreatedHandler(stockRepo)
);

// Notifications subscribes too — orders doesn't know or care
eventBus.subscribe(
  Events.orders.CREATED,
  new SendOrderConfirmationHandler(emailService)
);
```

### Outbox Pattern — Optional but Worth Knowing

In-memory means if the process crashes mid-publish, the event is lost. The Outbox Pattern prevents this:

```
1. Write command result AND event to DB in the SAME transaction
2. Background worker reads outbox table and publishes to EventBus
3. No crash can lose an event — DB transaction is atomic
```

---

## 8. Managing Events at Scale

### Event Registry — No Hardcoded Strings

```typescript
// core/events/registry.ts
export const Events = {
  orders: {
    CREATED:   'orders.order.created',
    CANCELLED: 'orders.order.cancelled',
    SHIPPED:   'orders.order.shipped',
  },
  inventory: {
    STOCK_LOW:      'inventory.stock.low',
    STOCK_DEPLETED: 'inventory.stock.depleted',
  },
  customers: {
    REGISTERED:     'customers.customer.registered',
    VIP_GRANTED:    'customers.customer.vip_granted',
  },
} as const;

// Compile-time safety — typos caught before runtime
export type EventName =
  typeof Events[keyof typeof Events][keyof typeof Events[keyof typeof Events]];
```

### Event Envelope — Standard Shell for Every Event

```typescript
// core/events/envelope.ts
export interface EventEnvelope<T = unknown> {
  eventId:       string;   // UUID — for deduplication
  eventName:     string;   // from registry — never hardcoded
  schemaVersion: number;   // handles breaking changes without breaking consumers
  occurredAt:    string;   // ISO 8601 timestamp
  correlationId: string;   // trace a full request across modules
  causationId:   string;   // which command caused this event
  payload:       T;
}
```

### Module Event Folders

```
orders/events/
├── published/           ← Orders team OWNS — others only consume
│   ├── OrderCreated.v1.ts
│   └── OrderCreated.v2.ts
└── consumed/            ← Read-only copies of other teams' event shapes
    └── UserRegistered.v1.ts
```

---

## 9. Schema Evolution

A published event is a public API. Treat it that way.

### The Golden Rule — Never Change, Only Add

```typescript
// orders.created.v1.ts — published, consumers depend on it
export interface OrderCreatedV1 {
  orderId: string;
  userId:  string;
  total:   number;
}

// orders.created.v2.ts — new field added, nothing removed or renamed
export interface OrderCreatedV2 {
  orderId:  string;   // ✅ kept
  userId:   string;   // ✅ kept
  total:    number;   // ✅ kept
  currency: string;   // ✅ added — new field only
}
```

### schemaVersion Handles It at Runtime

```typescript
function handleOrderCreated(envelope: EventEnvelope) {
  switch (envelope.schemaVersion) {
    case 1: return handleV1(envelope.payload as OrderCreatedV1);
    case 2: return handleV2(envelope.payload as OrderCreatedV2);
    default: logger.warn('Unknown schema version', envelope.schemaVersion);
  }
}

// Upcaster — converts old shape to new shape with safe defaults
function upcastV1toV2(v1: OrderCreatedV1): OrderCreatedV2 {
  return { ...v1, currency: 'USD' };
}
```

### Deprecation Process

```
Team A wants to add a field:

  1. Create OrderCreated.v2.ts — add field, keep ALL v1 fields
  2. Bump schemaVersion to 2
  3. Announce in Slack + post an ADR document
  4. Other teams get a grace period (e.g. 2 sprints) to handle v2
  5. v1 deprecated — consumers warned but not broken
  6. v1 removed only when zero consumers remain
```

### CODEOWNERS Enforcement

```
# .github/CODEOWNERS
src/modules/orders/events/published/    @orders-team
src/modules/inventory/events/published/ @inventory-team
src/core/                               @platform-team
```

---

## 10. Cross-Module Queries and JOINs

### In the Modular Monolith — Direct SQL JOIN

```typescript
// orders/queries/GetOrderDetail.ts
class GetOrderDetailHandler {
  async execute(query: GetOrderDetailQuery) {
    // One query, one DB, zero network calls
    return this.db.query(`
      SELECT
        o.id, o.status, o.total,
        u.name     AS customer_name,
        i.quantity AS stock_remaining
      FROM   orders.orders o
      JOIN   users.users u        ON u.id         = o.user_id
      JOIN   inventory.products i ON i.product_id = o.product_id
      WHERE  o.id = $1
    `, [query.orderId]);
  }
}
```

Latency ~1ms. Strong consistency. This is why you stay in the monolith as long as possible.

### After Microservices — Two Options

**Option A — API Composition:**

```typescript
class GetOrderDetailHandler {
  async execute(query: GetOrderDetailQuery) {
    const order = await this.orderRepo.findById(query.orderId);
    const [user, stock] = await Promise.all([
      this.userServiceClient.getUser(order.userId),           // HTTP call
      this.inventoryServiceClient.getStock(order.productId),  // HTTP call
    ]);
    return { ...order, customerName: user.name, stockRemaining: stock.quantity };
  }
}
// Adds latency and failure surface — simple but fragile
```

**Option B — Read Model (Recommended):**

```typescript
// Background listener pre-builds a flat table from events
class OrderDetailProjection {
  async onOrderCreated(event: EventEnvelope<OrderCreatedV1>) {
    await this.readDb.upsert('order_details', { order_id: event.payload.orderId });
  }
  async onCustomerVipChanged(event: EventEnvelope<CustomerVipChangedV1>) {
    await this.readDb.update('order_details',
      { customer_name: event.payload.name },
      { where: { customer_id: event.payload.customerId } }
    );
  }
}

// Query handler just reads the flat table — no JOINs at query time
class GetOrderDetailHandler {
  async execute(query: GetOrderDetailQuery) {
    return this.readDb.findOne('order_details', { order_id: query.orderId });
  }
}
// Fast reads, eventual consistency
```

---

## 11. Migration Plan — Phase by Phase

### Phase 1 — Modular Monolith Without Interfaces (Skip This)

```typescript
// Handler calls repos directly — no interface
class CreateOrderHandler {
  constructor(
    private orderRepo:    OrderRepository,
    private customerRepo: CustomerRepository, // ← direct repo, no interface
    private discountRepo: DiscountRepository, // ← direct repo, no interface
  ) {}
}
// Fast to build — but impossible to migrate cleanly later
// ❌ Do not build to this phase
```

### Phase 2 — Interfaces + Local Implementations (Build to Here)

This is your target. Same speed as Phase 1. Costs almost nothing extra. Pays off enormously later.

**Step 1 — Define interfaces and DTOs in core:**

```typescript
// core/interfaces/DTOs/CustomerDTO.ts
export interface CustomerDTO {
  id:    string;
  isVip: boolean;
  // plain data only — no methods, no domain objects
}

// core/interfaces/ICustomerService.ts
import { CustomerDTO } from './DTOs/CustomerDTO';

export interface ICustomerService {
  getCustomer(customerId: string): Promise<CustomerDTO>;
}
```

**Step 2 — Implement locally inside each module's infra:**

```typescript
// customers/infra/LocalCustomerService.ts
import { ICustomerService }  from '../../../core/interfaces/ICustomerService';
import { CustomerRepository } from './CustomerRepository';

export class LocalCustomerService implements ICustomerService {
  constructor(private repo: CustomerRepository) {}

  async getCustomer(customerId: string): Promise<CustomerDTO> {
    const customer = await this.repo.findById(customerId);
    return {
      id:    customer.id,
      isVip: customer.isVip(), // maps domain method to plain DTO field
    };
  }
}
```

**Step 3 — Handler depends on interface, never the concrete repo:**

```typescript
// orders/commands/CreateOrder.ts
import { ICustomerService } from '../../../core/interfaces/ICustomerService';
import { IDiscountService } from '../../../core/interfaces/IDiscountService';

export class CreateOrderHandler {
  constructor(
    private orderRepo:       OrderRepository,
    private customerService: ICustomerService,  // ← interface
    private discountService: IDiscountService,  // ← interface
    private pricingService:  PricingService,
    private eventBus:        IEventBus,
  ) {}

  async execute(cmd: CreateOrderCommand) {
    // Cross-domain fetches — handler's job
    const [customer, discount] = await Promise.all([
      this.customerService.getCustomer(cmd.customerId),
      this.discountService.getDiscount(cmd.discountCode),
    ]);

    // Plain values into domain — never domain objects from other modules
    const total = this.pricingService.calculate(
      cmd.items,
      customer.isVip,
      discount?.percentage ?? 0
    );

    const order = Order.create(cmd.items, cmd.customerId, total);
    await this.orderRepo.save(order);

    await this.eventBus.publish({
      eventName:     Events.orders.CREATED,
      schemaVersion: 1,
      payload:       { orderId: order.id, total: total.amount }
    });
  }
}
```

**Step 4 — Wire Local implementations in module.ts:**

```typescript
// orders.module.ts
export class OrdersModule {
  register(app: Express) {
    const orderRepo    = new OrderRepository(this.db);
    const customerRepo = new CustomerRepository(this.db);
    const discountRepo = new DiscountRepository(this.db);

    // Local implementations wired here — one place, easy to swap
    const customerService = new LocalCustomerService(customerRepo);
    const discountService = new LocalDiscountService(discountRepo);
    const pricingService  = new PricingService();

    const handler = new CreateOrderHandler(
      orderRepo,
      customerService,  // ← today: LocalCustomerService (DB call)
      discountService,  // ← today: LocalDiscountService (DB call)
      pricingService,
      this.eventBus,
    );

    this.commandBus.register(CreateOrderCommand, handler);

    const controller = new OrdersController(this.commandBus, this.queryBus);
    app.post('/orders',     controller.createOrder.bind(controller));
    app.get('/orders/:id',  controller.getOrder.bind(controller));
  }
}
```

### Phase 3 — Extract a Service (HTTP Transport)

When traffic demands it, extract one module. Only the wiring changes.

```typescript
// customers/infra/HttpCustomerService.ts — new file, implements same interface
export class HttpCustomerService implements ICustomerService {
  constructor(private baseUrl: string) {}

  async getCustomer(customerId: string): Promise<CustomerDTO> {
    const res  = await fetch(`${this.baseUrl}/customers/${customerId}`);
    const data = await res.json();
    return { id: data.id, isVip: data.isVip };
  }
}

// orders.module.ts — ONE LINE CHANGE
// Before:
const customerService = new LocalCustomerService(customerRepo);
// After:
const customerService = new HttpCustomerService('https://customers.internal');

// Handler — untouched
// Domain  — untouched
// Tests   — untouched
```

### Phase 4 — Event-Driven Read Model (Full Decoupling)

When you need resilience — Customers service being down should not break Orders.

```typescript
// orders/infra/EventDrivenCustomerService.ts
export class EventDrivenCustomerService implements ICustomerService {
  constructor(private localReadRepo: CustomerReadRepository) {}

  async getCustomer(customerId: string): Promise<CustomerDTO> {
    // Reads from Orders' OWN DB — no HTTP, no dependency on Customers service
    return this.localReadRepo.findById(customerId);
  }
}

// A background listener keeps the local cache fresh
class OnCustomerVipGranted {
  async handle(event: EventEnvelope<CustomerVipGrantedV1>) {
    await this.localReadRepo.update({
      id:    event.payload.customerId,
      isVip: true,
    });
  }
}

// orders.module.ts — ONE LINE CHANGE again
// Before:
const customerService = new HttpCustomerService('https://customers.internal');
// After:
const customerService = new EventDrivenCustomerService(customerReadRepo);
```

### The Full Journey

```
Phase 1 — No interfaces
  Handler → CustomerRepository (direct DB call)
  Fast to build — impossible to migrate
  ❌ Skip

Phase 2 — Interfaces + Local implementations   ← BUILD TO HERE NOW
  Handler → ICustomerService → LocalCustomerService → DB
  Zero behaviour change from Phase 1
  Migration later = one line swap
  ✅ Target

Phase 3 — HTTP between services               ← WHEN TRAFFIC DEMANDS
  Handler → ICustomerService → HttpCustomerService → HTTP → Customers Service
  One line change in wiring

Phase 4 — Event-driven read model             ← WHEN RESILIENCE DEMANDS
  Handler → ICustomerService → EventDrivenCustomerService → Local Read DB
                                       ↑
                             Customers publishes events
                             Orders keeps its own copy
  One line change in wiring
```

### What Never Changes Across All 4 Phases

```
Order.ts              ← never touched
PricingService.ts     ← never touched
CreateOrderHandler    ← logic never touched, only constructor wiring
Event publishing      ← never touched
Unit tests            ← never touched
```

---

## 12. Phase 2 Completion Checklist

Before you consider Phase 2 done, every item must be checked:

```
Core
  □ ICustomerService, IDiscountService, IInventoryService defined in core/interfaces/
  □ DTOs defined for each — plain data only, no domain objects or methods
  □ EventEnvelope<T> defined with eventId, schemaVersion, correlationId, causationId
  □ Event registry in place — zero hardcoded event name strings anywhere
  □ InMemoryEventBus implemented with subscribe and publish

Modules
  □ Each module has domain/, commands/, queries/, events/, infra/, module.ts
  □ LocalXService implementations inside each module's infra/
  □ All handlers depend on interfaces — zero direct repo imports across modules
  □ All cross-domain fetches happen in handlers — never in domain objects
  □ Domain objects are pure — no DB calls, no HTTP, no cross-module imports
  □ PricingService and domain services take plain values — not domain objects

Events
  □ published/ and consumed/ folders separated per module
  □ CODEOWNERS file in place — owning team must approve changes to published/
  □ At least one versioned event shape (v1) per published event

Wiring
  □ All wiring happens in module.ts files only
  □ main.ts only mounts modules — no business logic, no route paths
  □ EventBus subscriptions registered on startup in main.ts or module.ts

Verification
  □ No file in orders/ imports from customers/ domain/
  □ No file in customers/ imports from orders/ domain/
  □ No domain object receives another module's domain object as a parameter
  □ grep for direct repo imports across modules — should be zero
```

---

## 13. Quick Reference

### Layer Responsibilities

| Layer | Job | Allowed to import |
|---|---|---|
| Controller | Parse HTTP, call bus | CommandBus, QueryBus |
| Handler | Orchestrate use case | Interfaces, Domain, EventBus |
| Domain Object | Business rules | Own module's domain only |
| Domain Service | Cross-object logic in module | Own module's domain only |
| Repository | DB read/write | DB client only |
| LocalXService | Implement interface via DB | Own module's repo |
| HttpXService | Implement interface via HTTP | HTTP client only |

### Cross-Domain Rules

| Where | Cross-domain allowed? |
|---|---|
| Domain object | ❌ Never |
| Domain service | ❌ Never |
| Handler | ✅ Yes — this is its job |
| Repository | ❌ Never |
| Controller | ❌ Never |

### Event Management

| Problem | Solution |
|---|---|
| Too many event name strings | Central registry.ts |
| No standard event shape | EventEnvelope<T> with schemaVersion |
| Schema changed, consumers break | Never remove fields — only add |
| Old code still on old version | schemaVersion switch + upcaster |
| Who owns what event | published/ vs consumed/ per module |
| Preventing unauthorised changes | CODEOWNERS file in repo |

### Query Strategy by Architecture

| Architecture | How GetOrderDetail works | Latency | Consistency |
|---|---|---|---|
| Modular Monolith | Direct SQL JOIN | ~1ms | Strong |
| Microservices — API Composition | HTTP call per service | 10–100ms+ | Eventual |
| Microservices — Read Model | Query flat pre-joined table | ~1ms | Eventual |

### Migration Cost Per Layer

| Layer | Phase 2→3 effort | Phase 3→4 effort |
|---|---|---|
| Handler logic | Zero | Zero |
| Domain objects | Zero | Zero |
| Domain services | Zero | Zero |
| Event publishing | Zero | Zero |
| Unit tests | Zero | Zero |
| Module wiring | One line per extracted service | One line per extracted service |
| New file required | HttpXService | EventDrivenXService + projection |

---

> **The core principle:** The domain never knows how data was fetched or where it came from.
> It only receives plain values and enforces business rules.
> That single discipline is what makes the migration from monolith to microservices
> a wiring change — not a rewrite.
