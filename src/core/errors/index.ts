// ─────────────────────────────────────────────────────────────────────────────
// Core Errors — domain-level error vocabulary shared by all modules.
// HTTP mapping happens in the controller, never here.
// ─────────────────────────────────────────────────────────────────────────────

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, new.target.prototype); // fix instanceof in TS
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' was not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InsufficientStockError extends DomainError {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Insufficient stock for product '${productId}': ` +
      `requested ${requested}, available ${available}`
    );
    this.name = 'InsufficientStockError';
  }
}

export class InvalidDiscountError extends DomainError {
  constructor(code: string, reason: string) {
    super(`Discount code '${code}' is invalid: ${reason}`);
    this.name = 'InvalidDiscountError';
  }
}

export class OrderStateError extends DomainError {
  constructor(orderId: string, currentState: string, attemptedAction: string) {
    super(
      `Cannot '${attemptedAction}' order '${orderId}' — current state is '${currentState}'`
    );
    this.name = 'OrderStateError';
  }
}
