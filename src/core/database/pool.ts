import { createPool } from 'slonik';
import type { DatabasePool } from 'slonik';
import { env } from '../config/env';

// ─────────────────────────────────────────────────────────────────────────────
// pool.ts — single Slonik connection pool for the entire monolith.
//
// All modules share one pool in Phase 2.
// In Phase 3, each extracted service calls createAppPool() independently
// with its own DATABASE_URL — one line change per module constructor.
// ─────────────────────────────────────────────────────────────────────────────

let _pool: DatabasePool | null = null;

export async function createAppPool(): Promise<DatabasePool> {
  if (_pool) return _pool;

  _pool = await createPool(env.DATABASE_URL, {
    maximumPoolSize:   10,
    idleTimeout:       10_000,
    connectionTimeout: 5_000,
  });

  console.log('[Pool] ✅ Slonik pool created');
  return _pool;
}

export function getPool(): DatabasePool {
  if (!_pool) throw new Error('[Pool] Pool not initialised — call createAppPool() first');
  return _pool;
}

export type { DatabasePool };
