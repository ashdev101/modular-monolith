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

- **Express** — HTTP layer with `express-async-errors` (imported first in `main.ts`) so async errors automatically reach error middleware without try/catch
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
    consumed/           ← re-exports from core/events/payloads/ (ACL declaration, no own types)
    handlers/           ← IEventHandler<T> implementations (inventory only)
    published/          ← re-exports from core/events/payloads/ (ownership marker)
  infrastructure/
    acl/                ← LocalXxxService — implements core/interfaces/IXxxService for cross-module use
    http/               ← controller + request validation schemas
    persistence/        ← repository extending BaseRepository
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
│   ├── errors/index.ts               # DomainError, NotFoundError, ValidationError, ConflictError, etc.
│   ├── events/
│   │   ├── registry.ts               # Events const — every event name string defined once
│   │   ├── envelope.ts               # EventEnvelope<T> — wrapper for all published events
│   │   ├── catalog.ts                # EventCatalog + EventPayloadMap + publishEvent() helper
│   │   ├── payloads/                 # Zod schemas + inferred types for every event payload (per domain)
│   │   └── versions/                 # Versioned schemas + upcasters
│   ├── http/
│   │   ├── respond.ts                # respond.ok / created / noContent / fail — all response shapes
│   │   ├── errorMiddleware.ts        # Global Express error handler (registered last in main.ts)
│   │   └── requestContext.ts         # Attaches requestId to every request; echoes x-request-id header
│   ├── interfaces/                   # Cross-module service contracts (narrow role interfaces)
│   ├── repository/
│   │   └── BaseRepository.ts         # Abstract base — findById, findAll, existsById, findRowsWhere, now()
│   └── schemas/
│       ├── parseOrThrow.ts           # Zod → ValidationError; used in all controllers
│       └── dtos/                     # CustomerDTO, StockDTO, DiscountDTO (cross-module data shapes)
│
└── modules/
    ├── customers/
    │   ├── application/
    │   │   ├── commands/             # RegisterCustomerHandler, GrantVipHandler
    │   │   ├── queries/              # GetCustomerHandler, ListCustomersHandler
    │   │   └── ports/commands|queries/
    │   ├── domain/
    │   │   ├── Customer.ts           # reconstitute(row: CustomerRow)
    │   │   └── customer.schema.ts    # CustomerRowSchema (snake_case, z.coerce.date) + CustomerRow type
    │   ├── events/published/         # CustomerRegistered.v1.ts, CustomerVipGranted.v1.ts
    │   └── infrastructure/
    │       ├── acl/                  # LocalCustomerService
    │       ├── http/                 # CustomersController, customers.schemas.ts
    │       └── persistence/          # CustomerRepository extends BaseRepository<CustomerRow, Customer>
    │
    ├── inventory/
    │   ├── application/
    │   │   ├── commands/             # AddProductHandler
    │   │   ├── queries/              # GetStockHandler, ListProductsHandler
    │   │   └── ports/commands|queries/
    │   ├── domain/
    │   │   ├── Stock.ts              # reconstitute(row: StockRow); LOW_STOCK_THRESHOLD = 5
    │   │   └── stock.schema.ts       # StockRowSchema + StockRow type
    │   ├── events/
    │   │   ├── consumed/             # OrderCreated.v2.ts, OrderCancelled.v1.ts
    │   │   ├── handlers/             # OnOrderCreated, OnOrderCancelled
    │   │   └── published/            # StockLow.v1.ts, StockDepleted.v1.ts, StockRestored.v1.ts
    │   └── infrastructure/
    │       ├── acl/                  # LocalInventoryService
    │       ├── http/                 # InventoryController, inventory.schemas.ts
    │       └── persistence/          # StockRepository extends BaseRepository<StockRow, Stock>
    │
    ├── discounts/
    │   ├── application/
    │   │   ├── commands/             # CreateDiscountHandler
    │   │   ├── queries/              # GetDiscountHandler
    │   │   └── ports/commands|queries/
    │   ├── domain/
    │   │   ├── DiscountCode.ts       # reconstitute(row: DiscountRow)
    │   │   └── discount.schema.ts    # DiscountRowSchema + DiscountRow type
    │   └── infrastructure/
    │       ├── acl/                  # LocalDiscountService
    │       ├── http/                 # DiscountsController, discounts.schemas.ts
    │       └── persistence/          # DiscountRepository extends BaseRepository<DiscountRow, DiscountCode>
    │
    └── orders/
        ├── application/
        │   ├── commands/             # CreateOrderHandler, CancelOrderHandler
        │   ├── queries/              # GetOrderDetailHandler (cross-schema JOIN), GetOrdersByCustomerHandler
        │   └── ports/
        │       ├── commands/         # ICreateOrderUseCase (incl. CreateOrderCommand class + CreateOrderResult)
        │       └── queries/          # IGetOrderDetailUseCase (incl. GetOrderDetailQuery class + OrderDetailView)
        ├── domain/
        │   ├── Order.ts              # Aggregate Root; create(params) accepts optional id for pre-generation
        │   ├── order.schema.ts       # OrderRowSchema, OrderItemRowSchema, OrderStatusSchema
        │   ├── OrderItem.ts, Money.ts
        │   └── services/PricingService.ts  # VIP bonus only stacks with a promo code (intentional)
        ├── events/
        │   ├── consumed/             # CustomerRegistered.v1.ts (reserved — no handler wired yet)
        │   └── published/            # OrderCreated.v1.ts, OrderCreated.v2.ts
        └── infrastructure/
            ├── http/                 # OrdersController, orders.schemas.ts
            └── persistence/          # OrderRepository extends BaseRepository — overrides findById + findAll
```

---

## Three Hard Rules

### Rule 1 — Commands write to their own schema only

A command handler never writes to another module's DB schema. It fires an event; the other module reacts.

### Rule 2 — Queries can JOIN freely across schemas

Query handlers are read-only and may JOIN across any schema. This is the monolith's main advantage over microservices — one query, one round-trip, strong consistency. Cross-schema JOIN result schemas are defined locally inside the query handler file (not reused elsewhere).

### Rule 3 — Modules communicate only through interfaces or events

- Cross-module **reads**: via `IXService` interface (e.g. `ICustomerReader.getCustomer()`)
- Cross-module **writes**: via `IEventBus.publish()` + event handler subscription
- Never import another module's repository, domain object, or handler directly

---

## DB Layer — BaseRepository + Slonik + Zod

### BaseRepository

All repositories extend `BaseRepository<TRow, TDomain>` from `core/repository/BaseRepository.ts`.

Abstract members every subclass **must** declare:
- `schema: ZodType<TRow>` — Zod schema used by `sql.type()` at the DB boundary
- `table: string` — fully-qualified `'schema.table'`
- `entityName: string` — used in `NotFoundError` messages
- `selectCols: FragmentSqlToken` — explicit column list; **`SELECT *` is banned**
- `toDomain(row: TRow): TDomain` — single reconstitution point
- `save(entity: TDomain): Promise<void>` — abstract; compile error if omitted
- `update(entity: TDomain): Promise<void>` — abstract; compile error if omitted

Provided by the base (no need to implement):
- `findById`, `findByIdOrThrow`, `findAll`, `existsById`
- `protected findRowsWhere(filter: Partial<TRow>)` — keys constrained to real row properties at compile time; never expose publicly
- `protected now(): string` — `new Date().toISOString()`; use instead of a local `const now`

**OrderRepository** is the exception: it extends the base but overrides `findById` and `findAll` because `Order` reconstitution requires a second items query. `toDomain` throws as dead code — never call it directly on `OrderRepository`.

### Row schema pattern

Defined in `domain/*.schema.ts`, snake_case columns, `z.coerce.date()` for timestamps:

```typescript
export const CustomerRowSchema = z.object({
  id:             z.string().uuid(),
  name:           z.string(),
  email:          z.string(),
  is_vip:         z.boolean(),
  vip_granted_at: z.coerce.date().nullable(),
  created_at:     z.coerce.date(),
});
export type CustomerRow = z.infer<typeof CustomerRowSchema>;
```

No `z.transform()` — schema stays snake_case. Domain constructor maps `row.is_vip → isVip` etc.

### Slonik write pattern

```typescript
await this.pool.query(sql.unsafe`
  INSERT INTO customers.customers (id, name, ...) VALUES (${customer.id}, ${customer.name}, ...)
`);
```

### Slonik pool methods

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

## HTTP Layer

### No try/catch in controllers

`express-async-errors` (imported first in `main.ts`) patches Express so any thrown error or rejected promise automatically reaches `errorMiddleware` via `next(err)`. Controllers are pure business orchestration — no error handling code.

```typescript
async registerCustomer(req: Request, res: Response): Promise<void> {
  const body   = parseOrThrow(RegisterCustomerBodySchema, req.body, 'RegisterCustomer');
  const result = await this.registerCustomerUseCase.execute({ name: body.name, email: body.email });
  respond.created(res, result);
}
```

### respond helpers — all response shapes live here

```typescript
import { respond } from 'core/http/respond';

respond.ok(res, data)                        // 200 { success: true, data }
respond.created(res, data)                   // 201 { success: true, data }
respond.noContent(res)                       // 204
respond.fail(res, status, message, requestId) // { success: false, error, requestId }
```

Never call `res.json()` or `res.status().send()` directly in controllers or middleware.

### errorMiddleware — single error → status mapping

Registered **last** in `main.ts` (after all module routes). Maps domain error classes to HTTP status codes:

| Error class | Status |
|---|---|
| `NotFoundError` | 404 |
| `ValidationError` | 400 |
| `ConflictError` | 409 |
| `DomainError` (base) | 422 — catches `InsufficientStockError`, `InvalidDiscountError`, `OrderStateError` |
| unknown | 500 — logged server-side, "Internal server error" sent to client |

### requestContextMiddleware

Reads `x-request-id` from incoming header (set by gateway/load balancer) or generates a UUID. Attaches `req.requestId` and echoes it in the response header. Every error response body includes `requestId` for client-side error reporting.

### Error classes

Always use typed error classes from `core/errors/index.ts` — never `Object.assign(new Error(), {code})`:

```typescript
throw new ConflictError('Email already registered');   // → 409
throw new NotFoundError('Customer', id);               // → 404
throw new ValidationError('name is required');         // → 400
throw new DomainError('business rule violated');       // → 422
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
import type { IGrantVipUseCase, GrantVipCommand, GrantVipResult } from '../ports/commands/IGrantVipUseCase';

export class GrantVipHandler implements IGrantVipUseCase {
  constructor(private readonly repo: CustomerRepository, ...) {}
  async execute(cmd: GrantVipCommand): Promise<GrantVipResult> { ... }
}
```

### Orders commands use classes (implement ICommand/IQuery for correlation tracking)

`CreateOrderCommand`, `CancelOrderCommand`, `GetOrderDetailQuery`, `GetOrdersByCustomerQuery` are classes defined in their port files. Controllers instantiate them directly.

---

## Event System

### Published and consumed event files are re-export facades only

`core/events/payloads/` is the single source of truth for every event's Zod schema and inferred TypeScript type. Published and consumed files in modules never define their own types — they only re-export:

```typescript
// customers/events/published/CustomerRegistered.v1.ts
export { CustomerRegistered, CustomerRegisteredSchema }
  from '../../../../core/events/payloads/customers';

// inventory/events/consumed/OrderCreated.v2.ts
export { OrderCreated, OrderCreatedSchema }
  from '../../../../core/events/payloads/orders';
```

This means a payload shape change in `core/events/payloads/` breaks every consumer at compile time — exactly the guarantee we want.

### Never use raw event name strings

```typescript
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

`src/core/events/catalog.ts` is the single source of truth for what every event carries. Every new event must have an entry before it can be published. `publishedBy` must point to the **handler** that fires it, not the controller.

### Schema versioning

When payload shape changes: create `EventName.vN.ts` in `published/`, add an upcaster in `core/events/versions/`, bump `schemaVersion` in the catalog, update consuming handlers to call the upcaster. Never remove or rename existing fields.

### Event subscriptions belong in the constructor

Wire `eventBus.subscribe()` calls in the **module constructor**, not in `register()`. Handlers must be active as soon as the module is instantiated, independent of whether HTTP routes are registered.

---

## Cross-Module Service Pattern

Command handlers depend on narrow role interfaces from `core/interfaces/`, never on concrete repositories from other modules.

```typescript
// orders CreateOrderHandler
constructor(
  private readonly customerReader:  ICustomerReader,   // ← interface, not CustomerRepository
  private readonly inventoryService: IStockReader,
) {}
```

The `LocalXxxService` in `infrastructure/acl/` implements the interface using the module's own repository. Swapping to `HttpXxxService` in Phase 3 is one line in `module.module.ts`.

---

## Wiring — module.ts Is the Composition Root

All `new X()` calls happen inside the module constructor. `register(app)` only mounts HTTP routes — no instantiation there.

```
main.ts
  → import 'express-async-errors'   # must be first, before express
  → createAppPool()                  # async Slonik pool
  → runMigrations()                  # raw pg, no pool arg
  → app.use(requestContextMiddleware) # attaches requestId
  → app.use(express.json())
  → new CustomersModule(pool, eventBus)   → exposes .customerReader, .customerValidator
  → new InventoryModule(pool, eventBus)   → exposes .stockReader, .stockChecker; subscribes events
  → new DiscountsModule(pool)             → exposes .discountReader, .discountApplier
  → new OrdersModule(pool, eventBus, customerReader, stockReader, stockChecker, discountApplier)
  → module.register(app)             # routes only
  → app.use(errorMiddleware)         # must be last
```

Controllers take use-case interfaces directly — no CommandBus/QueryBus registry (over-engineering for this scale).
