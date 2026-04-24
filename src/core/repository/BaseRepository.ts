import { sql, type FragmentSqlToken, type DatabasePool } from 'slonik';
import { z, type ZodType } from 'zod';
import { NotFoundError } from '../errors';

// TRow  — the Zod-validated DB row shape (snake_case, matches the schema exactly)
// TDomain — the domain object returned to callers (defaults to TRow for read-only entities)
//
// Subclasses must declare:
//   schema      — Zod schema for the row (used by sql.type() at the DB boundary)
//   table       — fully-qualified table name: 'schema.table'
//   entityName  — human-readable name used in NotFoundError messages
//   selectCols  — explicit sql.fragment column list — SELECT * is banned
//   toDomain()  — maps a validated row to the domain object
//
// findRowsWhere() is protected and accepts Partial<TRow> so filter keys are
// constrained to real row properties at compile time. Subclasses expose typed
// wrapper methods (e.g. findByEmail) that call it with hardcoded column names.

export abstract class BaseRepository<TRow extends { id: string }, TDomain = TRow> {
  constructor(protected readonly pool: DatabasePool) {}

  protected abstract readonly schema: ZodType<TRow>;
  protected abstract readonly table: string;
  protected abstract readonly entityName: string;
  protected abstract readonly selectCols: FragmentSqlToken;

  protected abstract toDomain(row: TRow): TDomain;
  abstract save(entity: TDomain): Promise<void>;
  abstract update(entity: TDomain): Promise<void>;

  protected now(): string {
    return new Date().toISOString();
  }

  private get identifier() {
    const parts = this.table.split('.') as [string, string];
    return sql.identifier(parts);
  }

  async findById(id: string): Promise<TDomain | null> {
    const row = await this.pool.maybeOne(sql.type(this.schema)`
      SELECT ${this.selectCols} FROM ${this.identifier} WHERE id = ${id}
    `);
    return row ? this.toDomain(row) : null;
  }

  async findByIdOrThrow(id: string): Promise<TDomain> {
    const result = await this.findById(id);
    if (!result) throw new NotFoundError(this.entityName, id);
    return result;
  }

  async findAll(): Promise<TDomain[]> {
    const rows = await this.pool.any(sql.type(this.schema)`
      SELECT ${this.selectCols} FROM ${this.identifier}
    `);
    return rows.map(row => this.toDomain(row));
  }

  async existsById(id: string): Promise<boolean> {
    const row = await this.pool.one(sql.type(z.object({ exists: z.boolean() }))`
      SELECT EXISTS(
        SELECT 1 FROM ${this.identifier} WHERE id = ${id}
      ) AS exists
    `);
    return row.exists;
  }

  // Keys are constrained to actual TRow properties — no arbitrary string keys.
  // Date values are serialised to ISO strings before interpolation.
  // Always call via a typed wrapper method in the subclass, never expose publicly.
  protected async findRowsWhere(filter: Partial<TRow>): Promise<TDomain[]> {
    const entries = (Object.entries(filter) as [string, unknown][])
      .filter(([, v]) => v !== undefined);

    if (entries.length === 0) return this.findAll();

    const conditions = entries.map(([key, value]) => {
      const sqlValue = value instanceof Date ? value.toISOString() : value;
      return sql.fragment`${sql.identifier([key])} = ${sqlValue as string}`;
    });

    const whereClause = conditions.reduce(
      (acc, cond) => sql.fragment`${acc} AND ${cond}`,
    );

    const rows = await this.pool.any(sql.type(this.schema)`
      SELECT ${this.selectCols} FROM ${this.identifier} WHERE ${whereClause}
    `);
    return rows.map(row => this.toDomain(row));
  }
}
