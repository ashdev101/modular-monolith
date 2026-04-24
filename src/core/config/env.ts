import 'dotenv/config';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// env.ts — typed, validated environment config.
//
// Zod parses process.env once at startup. If a required variable is missing
// the app crashes immediately with a clear message — not 30 seconds later
// when the first DB query fires.
//
// Add all env vars here. Never read process.env directly elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

const EnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  PORT:         z.coerce.number().int().positive().default(3000),
  NODE_ENV:     z.enum(['development', 'production', 'test']).default('development'),

  // ── Event bus ──────────────────────────────────────────────────────────────
  // 'memory'  → InMemoryEventBus (default; no extra vars needed)
  // 'azure'   → AzureServiceBusEventBus (requires connection string below)
  EVENT_BUS_PROVIDER:                z.enum(['memory', 'azure']).default('memory'),
  AZURE_SERVICE_BUS_CONNECTION_STRING: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map(i => `  ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error('[env] ❌ Invalid environment variables:\n' + issues);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
