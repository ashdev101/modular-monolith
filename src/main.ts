import 'dotenv/config';
import express from 'express';
import { env } from './core/config/env';
import { createAppPool } from './core/database/pool';
import { runMigrations } from './core/database/migrate';
import { createEventBus } from './core/bus/createEventBus';
import { CustomersModule } from './modules/customers/customers.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';

async function bootstrap() {
  // ── Shared infrastructure ─────────────────────────────────────────────────
  const pool = await createAppPool();

  // createEventBus reads EVENT_BUS_PROVIDER from validated env config.
  //   memory → InMemoryEventBus   (default; no extra config)
  //   azure  → AzureServiceBusEventBus  (needs AZURE_SERVICE_BUS_CONNECTION_STRING)
  //
  // To switch from in-memory to Azure tomorrow:
  //   echo "EVENT_BUS_PROVIDER=azure" >> .env
  //   echo "AZURE_SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://..." >> .env
  //   Nothing else changes.
  const eventBus = createEventBus({
    provider:               env.EVENT_BUS_PROVIDER,
    azureConnectionString:  env.AZURE_SERVICE_BUS_CONNECTION_STRING,
  });

  // ── Run DB migrations ─────────────────────────────────────────────────────
  await runMigrations();

  // ── Instantiate modules ───────────────────────────────────────────────────
  // Module constructors call eventBus.subscribe() — no network calls yet.
  // Order matters: modules that produce events must be created before those
  // that consume them so subscriptions are registered before start().
  const customersModule  = new CustomersModule(pool, eventBus);
  const discountsModule  = new DiscountsModule(pool);
  const inventoryModule  = new InventoryModule(pool, eventBus);

  const ordersModule = new OrdersModule(
    pool,
    eventBus,
    customersModule.customerReader,    // ICustomerReader    → LocalCustomerService.getCustomer()
    inventoryModule.stockReader,       // IStockReader       → LocalInventoryService.getStock()
    inventoryModule.stockChecker,      // IStockAvailabilityChecker → LocalInventoryService.checkAvailability()
    discountsModule.discountApplier,   // IDiscountApplier   → LocalDiscountService.validateAndApply()
    // Phase 3: swap any line above for a single-method HTTP adapter.
    // e.g. new HttpCustomerReader('https://customers.internal') — implements only getCustomer().
  );

  // ── Start event bus (opens broker connections if using Azure/AWS/Kafka) ───
  // For InMemoryEventBus this is a no-op. For Azure it:
  //   1. Creates topics/subscriptions on the broker (idempotent)
  //   2. Opens AMQP receivers and starts the message pump
  await eventBus.start();

  // ── Express app ───────────────────────────────────────────────────────────
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', env: env.NODE_ENV, timestamp: new Date().toISOString() }),
  );

  customersModule.register(app);
  discountsModule.register(app);
  inventoryModule.register(app);
  ordersModule.register(app);

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // On SIGTERM (Kubernetes pod eviction, docker stop, etc.) we:
  //   1. Stop the event bus — drains in-flight messages, closes AMQP connection
  //   2. Close the DB pool  — waits for active queries to complete
  // This prevents message loss and connection leaks.
  const shutdown = async (signal: string) => {
    console.log(`\n[main] ${signal} received — shutting down gracefully…`);
    try {
      await eventBus.stop();
      await pool.end(); // Slonik drains in-flight queries before closing
      console.log('[main] ✅ Shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('[main] ❌ Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));   // Ctrl+C in dev

  // ── Start HTTP server ─────────────────────────────────────────────────────
  app.listen(env.PORT, () => {
    console.log('\n' + '═'.repeat(60));
    console.log('  Modular Monolith — PostgreSQL + Zod Edition');
    console.log('═'.repeat(60));
    console.log(`  http://localhost:${env.PORT}`);
    console.log(`  Event bus: ${env.EVENT_BUS_PROVIDER}`);
    console.log('');
    console.log('  Seed IDs (from migrations):');
    console.log('    VIP customer:   00000000-0000-0000-0000-000000000001');
    console.log('    Regular:        00000000-0000-0000-0000-000000000002');
    console.log('    Laptop:         00000000-0000-0000-0001-000000000001');
    console.log('    Phone:          00000000-0000-0000-0001-000000000002');
    console.log('    Headset:        00000000-0000-0000-0001-000000000003');
    console.log('    Discount codes: SAVE10 | VIP20 | FLASH5');
    console.log('═'.repeat(60) + '\n');
  });
}

bootstrap().catch(err => {
  console.error('[main] Fatal startup error:', err);
  process.exit(1);
});
