# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev          # ts-node src/main.ts
npm run dev:watch    # nodemon wrapper
npm run build        # tsc — emits to dist/
npm start            # node dist/main.js (requires build first)
npx tsc --noEmit     # type-check without emitting
```

No test runner is configured. TypeScript errors surface via `npx tsc --noEmit` or `npm run build`.

Requires a running PostgreSQL instance. Set `DATABASE_URL` in `.env`. Migrations run automatically on startup via `runMigrations()` in `main.ts`.

---

## What This Project Is

A **Modular Monolith** — one process, one PostgreSQL database, hard module boundaries enforced through interfaces, events, and domain isolation. The goal is microservice-readiness without premature distribution.

Three migration phases:
- **Phase 2 (current)** — `LocalXService` implementations talk to the local DB. Cross-module calls go through interfaces.
- **Phase 3** — swap `LocalXService` → `HttpXService` in `module.ts`. One line per extracted service. Nothing else changes.
- **Phase 4** — event-driven read projections if eventual consistency is acceptable.

---

## Stack

- **Express** — HTTP layer
- **PostgreSQL** — single instance, multiple schemas (`orders.*`, `customers.*`, `inventory.*`, `discounts.*`)
- **Slonik v44** — type-safe PostgreSQL client; `sql.type(ZodSchema)` validates every SELECT result at the DB boundary. `createPool()` is **async** — must be awaited in `main.ts`.
- **Zod** — validation at HTTP boundary, DB boundary, and event publishing. `z.coerce.date()` for timestamp columns.
- **Event bus** — `InMemoryEventBus` (default) or `AzureServiceBusEventBus`; swap via `EVENT_BUS_PROVIDER=azure` env var.
- **`migrate.ts` uses raw `pg`** — Slonik's tagged-template API cannot execute arbitrary SQL strings from migration files. `migrate.ts` creates its own short-lived `pg.Pool` internally; callers pass nothing to `runMigrations()`.

---

## Module Structure

Every module follows this identical layout — no exceptions:

```
module/
  application/
    commands/           ← use case handlers (implement the port interface)
    queries/            ← query handlers (implement the port interface)
    ports/
      commands/         ← IXxxUseCase.ts — self-contained: Command + Result types + interface
      queries/          ← IXxxUseCase.ts — self-contained: Query + View types + interface
  domain/               ← entities, value objects, domain schemas, domain services
    services/           ← pure domain logic (orders only: PricingService)
  events/
    consumed/           ← read-only ACL copies of other modules' event shapes
    handlers/           ← IEventHandler<T> implementations (inventory only)
    published/          ← this module's outbound event shapes (the public contract)
  infrastructure/
    acl/                ← LocalXxxService — implements core/interfaces/IXxxService for cross-module use
    http/               ← controller + request validation schemas
    persistence/        ← repository (Slonik)
  module.module.ts      ← composition root — the ONLY file that calls new X()
```

### Dependency direction (must never be reversed)

```
infrastructure → application/ports → domain → (nothing)
application/commands|queries → application/ports (handler imports types FROM its port)
```

Port files are self-contained contracts: they define the input/output types AND the interface. Handlers import from the port — ports never import from handlers.

---

## Project File Tree

```
src/
├── core/
│   ├── bus/
│   │   ├── EventBus.ts               # IEventBus + IEventHandler interfaces (barrel re-export)
│   │   ├── IEventBus.ts
│   │   ├── InMemoryEventBus.ts       # default; Promise.allSettled fan-out
│   │   ├── AzureServiceBusEventBus.ts
│   │   ├── createEventBus.ts         # factory — reads EVENT_BUS_PROVIDER env
│   │   ├── CommandBus.ts             # ICommand interface only
│   │   └── QueryBus.ts               # IQuery interface only
│   ├── config/env.ts                 # Zod-parsed process.env — only place env vars are read
│   ├── database/
│   │   ├── pool.ts                   # async createAppPool() → DatabasePool (Slonik)
│   │   └── migrate.ts                # runMigrations() — uses raw pg internally
│   ├── errors/index.ts               # DomainError, NotFoundError, ValidationError, etc.
│   ├── events/
│   │   ├── registry.ts               # Events const — every event name string defined once
│   │   ├── envelope.ts               # EventEnvelope<T> — wrapper for all published events
│   │   ├── catalog.ts                # EventCatalog + EventPayloadMap + publishEvent() helper
│   │   ├── payloads/                 # Zod schemas for every event payload (per domain)
│   │   └── versions/                 # Versioned schemas + upcasters
│   ├── interfaces/                   # Cross-module service contracts: ICustomerService, IInventoryService, IDiscountService
│   └── schemas/
│       ├── parseOrThrow.ts           # Zod → ValidationError; used in all controllers
│       └── dtos/                     # CustomerDTO, StockDTO, DiscountDTO (cross-module data shapes)
│
└── modules/
    ├── customers/
    │   ├── application/
    │   │   ├── commands/             # RegisterCustomerHandler, GrantVipHandler
    │   │   ├── queries/              # GetCustomerHandler, ListCustomersHandler
    │   │   └── ports/commands|queries/  # IRegisterCustomerUseCase, IGrantVipUseCase, IGetCustomerUseCase, IListCustomersUseCase
    │   ├── domain/
    │   │   ├── Customer.ts           # reconstitute(row: CustomerRow)
    │   │   └── customer.schema.ts    # CustomerRowSchema (snake_case, z.coerce.date) + CustomerRow type
    │   ├── events/published/         # CustomerRegistered.v1.ts, CustomerVipGranted.v1.ts
    │   └── infrastructure/
    │       ├── acl/                  # LocalCustomerService
    │       ├── http/                 # CustomersController, customers.schemas.ts
    │       └── persistence/          # CustomerRepository
    │
    ├── inventory/
    │   ├── application/
    │   │   ├── commands/             # AddProductHandler
    │   │   ├── queries/              # GetStockHandler, ListProductsHandler
    │   │   └── ports/commands|queries/  # IAddProductUseCase, IGetStockUseCase, IListProductsUseCase
    │   ├── domain/
    │   │   ├── Stock.ts              # reconstitute(row: StockRow)
    │   │   └── stock.schema.ts       # StockRowSchema + StockRow type
    │   ├── events/
    │   │   ├── consumed/             # OrderCreated.v2.ts, OrderCancelled.v1.ts
    │   │   ├── handlers/             # OnOrderCreated, OnOrderCancelled
    │   │   └── published/            # StockLow.v1.ts, StockDepleted.v1.ts, StockRestored.v1.ts
    │   └── infrastructure/
    │       ├── acl/                  # LocalInventoryService
    │       ├── http/                 # InventoryController, inventory.schemas.ts
    │       └── persistence/          # StockRepository
    │
    ├── discounts/
    │   ├── application/
    │   │   ├── commands/             # CreateDiscountHandler
    │   │   ├── queries/              # GetDiscountHandler
    │   │   └── ports/commands|queries/  # ICreateDiscountUseCase, IGetDiscountUseCase
    │   ├── domain/
    │   │   ├── DiscountCode.ts       # reconstitute(row: DiscountRow)
    │   │   └── discount.schema.ts    # DiscountRowSchema + DiscountRow type
    │   └── infrastructure/
    │       ├── acl/                  # LocalDiscountService
    │       ├── http/                 # DiscountsController, discounts.schemas.ts
    │       └── persistence/          # DiscountRepository
    │
    └── orders/
        ├── application/
        │   ├── commands/             # CreateOrderHandler, CancelOrderHandler
        │   ├── queries/              # GetOrderDetailHandler (cross-schema JOIN), GetOrdersByCustomerHandler
        │   └── ports/
        │       ├── commands/         # ICreateOrderUseCase (incl. CreateOrderCommand class + CreateOrderResult)
        │       └── queries/          # IGetOrderDetailUseCase (incl. GetOrderDetailQuery class + OrderDetailView)
        ├── domain/
        │   ├── Order.ts              # Aggregate Root; reconstitute(row: OrderRow, items: OrderItem[], total: Money)
        │   ├── order.schema.ts       # OrderRowSchema, OrderItemRowSchema, OrderStatusSchema
        │   ├── OrderItem.ts, Money.ts
        │   └── services/PricingService.ts
        ├── events/
        │   ├── consumed/             # CustomerRegistered.v1.ts
        │   └── published/            # OrderCreated.v1.ts, OrderCreated.v2.ts
        └── infrastructure/
            ├── http/                 # OrdersController, orders.schemas.ts
            └── persistence/          # OrderRepository (batched item fetch — no N+1)
```

---

## Three Hard Rules

### Rule 1 — Commands write to their own schema only

A command handler never writes to another module's DB schema. It fires an event; the other module reacts.

### Rule 2 — Queries can JOIN freely across schemas

Query handlers are read-only and may JOIN across any schema. This is the monolith's main advantage over microservices — one query, one round-trip, strong consistency. Cross-schema JOIN result schemas are defined locally inside the query handler file (not reused elsewhere).

### Rule 3 — Modules communicate only through interfaces or events

- Cross-module **reads**: via `IXService` interface (e.g. `ICustomerService.getCustomer()`)
- Cross-module **writes**: via `IEventBus.publish()` + event handler subscription
- Never import another module's repository, domain object, or handler directly

---

## DB Layer — Slonik + Zod Row Schemas

Every SELECT result is validated by Zod at the DB boundary via `sql.type(Schema)`. If a migration renames a column, the `ZodError` fires in the repository, not silently deep in business logic.

**Row schema pattern** — defined in `domain/*.schema.ts`, snake_case columns, `z.coerce.date()` for timestamps:

```typescript
// domain/customer.schema.ts
export const CustomerRowSchema = z.object({
  id:             z.string().uuid(),
  name:           z.string(),
  email:          z.string(),
  is_vip:         z.boolean(),
  vip_granted_at: z.coerce.date().nullable(),
  created_at:     z.coerce.date(),
});
export type CustomerRow = z.infer<typeof CustomerRowSchema>;
// Domain class: static reconstitute(row: CustomerRow) — maps snake_case in constructor
```

No `z.transform()` — the schema stays as snake_case. The domain constructor maps `row.is_vip → isVip` etc.

**Slonik write pattern** — `sql.unsafe` tagged template (parameterised, just untyped result):

```typescript
await this.pool.query(sql.unsafe`
  INSERT INTO customers.customers (id, name, ...) VALUES (${customer.id}, ${customer.name}, ...)
`);
```

**Slonik pool methods:**

| Method | Returns | Throws if |
|---|---|---|
| `pool.any(sql.type(S)...)` | `readonly T[]` | never |
| `pool.one(sql.type(S)...)` | `T` | 0 or >1 rows |
| `pool.maybeOne(sql.type(S)...)` | `T \| null` | >1 rows |
| `pool.transaction(async tx => {...})` | — | on error, auto-rollback |

**N+1 prevention** — `OrderRepository.findByCustomerId` fetches all order rows then one batched items query:

```typescript
WHERE order_id = ANY(${sql.array(orderIds, 'uuid')})
```

---

## Application Layer Pattern

### Ports are self-contained contracts

Every port file (`application/ports/commands/IXxxUseCase.ts` or `.../queries/IXxxUseCase.ts`) defines:
1. The input type (Command or Query interface/class)
2. The output type (Result or View interface)
3. The use case interface itself

```typescript
// application/ports/commands/IGrantVipUseCase.ts
export interface GrantVipCommand { customerId: string; }
export interface GrantVipResult  { id: string; isVip: boolean; }
export interface IGrantVipUseCase {
  execute(cmd: GrantVipCommand): Promise<GrantVipResult>;
}
```

### Handlers implement the port, import types from it

```typescript
// application/commands/GrantVip.ts
import type { IGrantVipUseCase, GrantVipCommand, GrantVipResult } from '../ports/commands/IGrantVipUseCase';

export class GrantVipHandler implements IGrantVipUseCase {
  // repo type imported from infrastructure/persistence/ — the only direction allowed
  constructor(private readonly repo: CustomerRepository, ...) {}
  async execute(cmd: GrantVipCommand): Promise<GrantVipResult> { ... }
}
```

### Orders commands use classes (implement ICommand/IQuery for correlation tracking)

`CreateOrderCommand`, `CancelOrderCommand`, `GetOrderDetailQuery`, `GetOrdersByCustomerQuery` are classes defined in their port files. Controllers instantiate them directly.

---

## Event System

### Never use raw event name strings

```typescript
// Always reference the registry
import { Events } from '../../../core/events/registry';
await publishEvent(bus, Events.orders.CANCELLED, { ... });
```

### Use `publishEvent()`, not `bus.publish()` directly

```typescript
import { publishEvent } from '../../../core/events/catalog';

await publishEvent(bus, Events.orders.CREATED, {
  correlationId: cmd.correlationId,
  causationId:   cmd.correlationId,
  payload: { orderId: order.id, ... },
  // schemaVersion auto-filled; payload type is inferred — wrong fields = compile error
});
```

### EventCatalog

`src/core/events/catalog.ts` is the single source of truth for what every event carries. Every new event must have an entry before it can be published.

### Schema versioning

When payload shape changes: create `EventName.vN.ts` in `published/`, add an upcaster in `core/events/versions/`, bump `schemaVersion` in the catalog, update consuming handlers to call the upcaster. Never remove or rename existing fields.

---

## Cross-Module Service Pattern

Command handlers depend on `IXService` interfaces from `core/interfaces/`, never on concrete repositories from other modules.

```typescript
// orders CreateOrderHandler
constructor(
  private readonly customerService:  ICustomerService,   // ← interface, not CustomerRepository
  private readonly inventoryService: IInventoryService,
) {}
```

The `LocalXxxService` in `infrastructure/acl/` implements the interface using the module's own repository. Swapping to `HttpXxxService` in Phase 3 is one line in `module.module.ts`.

---

## Wiring — module.ts Is the Composition Root

All `new X()` calls happen inside `module.module.ts`. Nothing else instantiates concrete classes.

```
main.ts
  → createAppPool()           # async Slonik pool
  → runMigrations()           # raw pg, no pool arg
  → new CustomersModule(pool, eventBus)   → exposes .customerService
  → new InventoryModule(pool, eventBus)   → exposes .inventoryService
  → new DiscountsModule(pool)             → exposes .discountService
  → new OrdersModule(pool, eventBus, customerService, inventoryService, discountService)
  → module.register(app)      # routes + event subscriptions
```

Controllers take use-case interfaces directly — no CommandBus/QueryBus registry (over-engineering for this scale).
