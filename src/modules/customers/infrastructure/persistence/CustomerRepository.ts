import { sql } from 'slonik';
import { z } from 'zod';
import type { DatabasePool } from '../../../../core/database/pool';
import { NotFoundError } from '../../../../core/errors';
import { Customer } from '../../domain/Customer';
import { CustomerRowSchema } from '../../domain/customer.schema';

const SELECT_COLS = sql.fragment`id, name, email, is_vip, vip_granted_at, created_at`;
const now = () => new Date().toISOString();

export class CustomerRepository {
  constructor(private readonly pool: DatabasePool) {}

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
        ${now()}
      )
    `);
  }

  async update(customer: Customer): Promise<void> {
    await this.pool.query(sql.unsafe`
      UPDATE customers.customers
      SET is_vip         = ${customer.isVip},
          vip_granted_at = ${customer.vipGrantedAt?.toISOString() ?? null},
          updated_at     = ${now()}
      WHERE id = ${customer.id}
    `);
  }

  async findById(id: string): Promise<Customer | null> {
    const row = await this.pool.maybeOne(sql.type(CustomerRowSchema)`
      SELECT ${SELECT_COLS} FROM customers.customers WHERE id = ${id}
    `);
    return row ? Customer.reconstitute(row) : null;
  }

  async findByIdOrThrow(id: string): Promise<Customer> {
    const customer = await this.findById(id);
    if (!customer) throw new NotFoundError('Customer', id);
    return customer;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const row = await this.pool.maybeOne(sql.type(CustomerRowSchema)`
      SELECT ${SELECT_COLS} FROM customers.customers WHERE email = ${email.toLowerCase()}
    `);
    return row ? Customer.reconstitute(row) : null;
  }

  async existsById(id: string): Promise<boolean> {
    const row = await this.pool.one(sql.type(z.object({ exists: z.boolean() }))`
      SELECT EXISTS(SELECT 1 FROM customers.customers WHERE id = ${id}) AS exists
    `);
    return row.exists;
  }

  async findAll(): Promise<Customer[]> {
    const rows = await this.pool.any(sql.type(CustomerRowSchema)`
      SELECT ${SELECT_COLS} FROM customers.customers ORDER BY created_at DESC
    `);
    return rows.map(row => Customer.reconstitute(row));
  }
}
