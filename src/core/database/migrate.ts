import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { env } from '../config/env';

// ─────────────────────────────────────────────────────────────────────────────
// migrate.ts — runs SQL migration files at startup.
//
// Uses pg directly (not Slonik) because migrations execute arbitrary SQL
// strings read from disk, which Slonik's tagged-template API doesn't support.
// A short-lived pg.Pool is created, used, then closed — the Slonik pool is
// unaffected and starts clean after migrations complete.
// ─────────────────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');

export async function runMigrations(): Promise<void> {
  console.log('[Migrate] Running migrations…');

  const pgPool = new Pool({ connectionString: env.DATABASE_URL });

  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS public.migrations (
        id          SERIAL      PRIMARY KEY,
        filename    TEXT        NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await pgPool.query(
        'SELECT id FROM public.migrations WHERE filename = $1', [file]
      );

      if (rows.length > 0) {
        console.log(`[Migrate] ⏭  Skip (already ran): ${file}`);
        continue;
      }

      const sqlText = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sqlText);
        await client.query('INSERT INTO public.migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[Migrate] ✅ Ran: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    console.log('[Migrate] All migrations up to date');
  } finally {
    await pgPool.end();
  }
}
