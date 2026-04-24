import { sql } from 'slonik';
import type { DatabasePool } from '../../../../core/database/pool';
import { NotFoundError } from '../../../../core/errors';
import { Stock } from '../../domain/Stock';
import { StockRowSchema } from '../../domain/stock.schema';

const SELECT_COLS = sql.fragment`id, product_name, unit_price, quantity, created_at`;
const now = () => new Date().toISOString();

export class StockRepository {
  constructor(private readonly pool: DatabasePool) {}

  async save(stock: Stock): Promise<void> {
    await this.pool.query(sql.unsafe`
      INSERT INTO inventory.products (id, product_name, unit_price, quantity, created_at, updated_at)
      VALUES (
        ${stock.id},
        ${stock.productName},
        ${stock.unitPrice},
        ${stock.quantity},
        ${stock.createdAt.toISOString()},
        ${now()}
      )
    `);
  }

  async update(stock: Stock): Promise<void> {
    await this.pool.query(sql.unsafe`
      UPDATE inventory.products
      SET quantity = ${stock.quantity}, updated_at = ${now()}
      WHERE id = ${stock.id}
    `);
  }

  async findById(id: string): Promise<Stock | null> {
    const row = await this.pool.maybeOne(sql.type(StockRowSchema)`
      SELECT ${SELECT_COLS} FROM inventory.products WHERE id = ${id}
    `);
    return row ? Stock.reconstitute(row) : null;
  }

  async findByIdOrThrow(id: string): Promise<Stock> {
    const stock = await this.findById(id);
    if (!stock) throw new NotFoundError('Product', id);
    return stock;
  }

  async findAll(): Promise<Stock[]> {
    const rows = await this.pool.any(sql.type(StockRowSchema)`
      SELECT ${SELECT_COLS} FROM inventory.products ORDER BY product_name
    `);
    return rows.map(row => Stock.reconstitute(row));
  }
}
