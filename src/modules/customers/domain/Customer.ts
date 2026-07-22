import { v4 as uuidv4 } from 'uuid';
import { DomainError, ValidationError } from '../../../core/errors';
import type { CustomerRow } from './customer.schema';

export class Customer {
  private _name:        string;
  private _email:       string;
  private _isVip:       boolean;
  private _vipGrantedAt: Date | null;

  private constructor(
    public readonly id:        string,
    name:                      string,
    email:                     string,
    isVip:                     boolean,
    public readonly createdAt: Date,
    vipGrantedAt:              Date | null,
  ) {
    this._name = name;
    this._email = email;
    this._isVip = isVip;
    this._vipGrantedAt = vipGrantedAt;
  }

  static register(name: string, email: string): Customer {
    if (!name || name.trim().length < 2) {
      throw new ValidationError('Customer name must be at least 2 characters');
    }
    return new Customer(uuidv4(), name.trim(), email.toLowerCase().trim(), false, new Date(), null);
  }

  static reconstitute(row: CustomerRow): Customer {
    return new Customer(
      row.id,
      row.name,
      row.email,
      row.is_vip,
      row.created_at,
      row.vip_granted_at,
    );
  }

  grantVip(): void {
    if (this._isVip) throw new DomainError(`Customer '${this.id}' is already a VIP`);
    this._isVip = true;
    this._vipGrantedAt = new Date();
  }

  revokeVip(): void {
    if (!this._isVip) throw new DomainError(`Customer '${this.id}' is not a VIP`);
    this._isVip = false;
    this._vipGrantedAt = null;
  }

  updateProfile(name: string, email: string): void {
    if (!name || name.trim().length < 2) throw new ValidationError('Customer name must be at least 2 characters');
    this._name  = name.trim();
    this._email = email.toLowerCase().trim();
  }

  get name():         string       { return this._name; }
  get email():        string       { return this._email; }
  get isVip():        boolean      { return this._isVip; }
  get vipGrantedAt(): Date | null  { return this._vipGrantedAt; }
}
