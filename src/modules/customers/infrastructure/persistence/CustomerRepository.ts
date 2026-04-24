import { sql, type FragmentSqlToken } from 'slonik';
import { type ZodType } from 'zod';
import type { DatabasePool } from '../../../../core/database/pool';
import { BaseRepository } from '../../../../core/repository/BaseRepository';
import { Customer } from '../../domain/Customer';
import { CustomerRowSchema, type CustomerRow } from '../../domain/customer.schema';

const SELECT_COLS = sql.fragment`id, name, email, is_vip, vip_granted_at, created_at`;

export class CustomerRepository extends BaseRepository<CustomerRow, Customer> {
  protected readonly schema: ZodType<CustomerRow> = CustomerRowSchema;
  protected readonly table = 'customers.customers';
  protected readonly entityName = 'Customer';
  protected readonly selectCols: FragmentSqlToken = SELECT_COLS;

  constructor(pool: DatabasePool) {
    super(pool);
  }

  protected toDomain(row: CustomerRow): Customer {
    return Customer.reconstitute(row);
  }

  async save(customer: Customer): Promise<void> {
    await this.pool.query(sql.unsafe`
      INSERT INTO customers.customers
        (id, name, email, is_vip, vip_granted_at, created_at, updated_at)
      VALUES (
        ${customer.id},
        ${customer.name},
        ${customer.email},
        ${customer.isVip},
        ${customer.vipGrantedAt?.toISOString() ?? null},
        ${customer.createdAt.toISOString()},
        ${this.now()}
      )
    `);
  }

  async update(customer: Customer): Promise<void> {
    await this.pool.query(sql.unsafe`
      UPDATE customers.customers
      SET is_vip         = ${customer.isVip},
          vip_granted_at = ${customer.vipGrantedAt?.toISOString() ?? null},
          updated_at     = ${this.now()}
      WHERE id = ${customer.id}
    `);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const results = await this.findRowsWhere({ email: email.toLowerCase() } as Partial<CustomerRow>);
    return results[0] ?? null;
  }
}
