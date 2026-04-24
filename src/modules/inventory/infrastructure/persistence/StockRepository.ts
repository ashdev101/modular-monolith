import { sql, type FragmentSqlToken } from 'slonik';
import { type ZodType } from 'zod';
import type { DatabasePool } from '../../../../core/database/pool';
import { BaseRepository } from '../../../../core/repository/BaseRepository';
import { Stock } from '../../domain/Stock';
import { StockRowSchema, type StockRow } from '../../domain/stock.schema';

const SELECT_COLS = sql.fragment`id, product_name, unit_price, quantity, created_at`;

export class StockRepository extends BaseRepository<StockRow, Stock> {
  protected readonly schema: ZodType<StockRow> = StockRowSchema;
  protected readonly table = 'inventory.products';
  protected readonly entityName = 'Product';
  protected readonly selectCols: FragmentSqlToken = SELECT_COLS;

  constructor(pool: DatabasePool) {
    super(pool);
  }

  protected toDomain(row: StockRow): Stock {
    return Stock.reconstitute(row);
  }

  async save(stock: Stock): Promise<void> {
    await this.pool.query(sql.unsafe`
      INSERT INTO inventory.products (id, product_name, unit_price, quantity, created_at, updated_at)
      VALUES (
        ${stock.id},
        ${stock.productName},
        ${stock.unitPrice},
        ${stock.quantity},
        ${stock.createdAt.toISOString()},
        ${this.now()}
      )
    `);
  }

  async update(stock: Stock): Promise<void> {
    await this.pool.query(sql.unsafe`
      UPDATE inventory.products
      SET quantity = ${stock.quantity}, updated_at = ${this.now()}
      WHERE id = ${stock.id}
    `);
  }
}
