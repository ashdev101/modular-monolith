/**
 * Checks whether a product has sufficient stock to fulfil a quantity request.
 *
 * Consumers: orders (availability gate before order creation).
 *
 * Phase 3 swap: HttpStockAvailabilityChecker → GET /inventory/:id/availability?qty=N
 * Deliberately separate from IStockReader — a reservation service
 * might only need this check, never the full product data.
 */
export interface IStockAvailabilityChecker {
  checkAvailability(productId: string, quantity: number): Promise<boolean>;
}
