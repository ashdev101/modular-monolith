import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Inventory domain — event payload schemas.
// ─────────────────────────────────────────────────────────────────────────────

// ── inventory.stock.low ───────────────────────────────────────────────────
// Fired when stock drops below the low-stock threshold after an order.
export const StockLowSchema = z.object({
  productId:         z.string().uuid(),
  productName:       z.string(),
  remainingQuantity: z.number().int().nonnegative(),
  threshold:         z.number().int().positive(),
});
export type StockLow = z.infer<typeof StockLowSchema>;

// ── inventory.stock.depleted ─────────────────────────────────────────────
// Fired when stock hits exactly 0 after an order.
export const StockDepletedSchema = z.object({
  productId:   z.string().uuid(),
  productName: z.string(),
  orderId:     z.string().uuid(),   // the order that caused depletion
});
export type StockDepleted = z.infer<typeof StockDepletedSchema>;

// ── inventory.stock.restored ─────────────────────────────────────────────
// Fired when stock is put back after an order cancellation.
export const StockRestoredSchema = z.object({
  productId:    z.string().uuid(),
  restoredQty:  z.number().int().positive(),
  newTotalQty:  z.number().int().nonnegative(),
  reason:       z.string(),
});
export type StockRestored = z.infer<typeof StockRestoredSchema>;
