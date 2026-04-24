import { Money } from '../Money';
import type { OrderItem } from '../OrderItem';

// ─────────────────────────────────────────────────────────────────────────────
// PricingService — Domain Service.
//
// Use a domain service (not a method on Order) when the logic:
//   1. Spans multiple value objects (items, VIP flag, discount)
//   2. Needs data from multiple modules — but ONLY their plain-data results,
//      never their domain objects
//
// This service is PURE: no DB, no HTTP, no imports from other modules.
// It receives plain primitives and returns a Money value object.
//
// Test it with:
//   new PricingService().calculate([item], true, 10)
// No mocks needed. No setup. Plain values in, Money out.
// ─────────────────────────────────────────────────────────────────────────────

export interface PricingResult {
  subtotal:      Money;   // sum of item subtotals before any discount
  discountAmt:   Money;   // amount taken off
  total:         Money;   // final charge
  appliedVip:    boolean; // whether VIP discount was included
  discountPct:   number;  // effective total discount % applied
}

export class PricingService {
  /** VIP customers get an additional % off on top of any promo code */
  private static readonly VIP_BONUS_PCT = 5;

  calculate(
    items:            OrderItem[],
    isVip:            boolean,  // plain boolean — NOT a Customer domain object
    promoDiscountPct: number,   // plain number  — NOT a DiscountCode domain object
  ): PricingResult {
    // Step 1: sum item subtotals
    const subtotal = items.reduce(
      (sum, item) => sum.add(item.subtotal),
      Money.zero()
    );

    // Step 2: apply promo code discount (if any)
    const promoFraction = promoDiscountPct / 100;

    // Step 3: VIP stacks on top of promo — senior architect decision:
    //   VIP bonus applies to the ALREADY-DISCOUNTED price, not the base.
    //   This prevents double-dipping exploitation.
    const vipFraction = isVip && promoDiscountPct > 0
      ? PricingService.VIP_BONUS_PCT / 100
      : 0;

    // Total effective discount
    const effectivePct = promoDiscountPct + (vipFraction * 100);

    // Compute discount amount and final total
    const promoDiscount = subtotal.multiply(promoFraction);
    const afterPromo    = subtotal.subtract(promoDiscount);
    const vipDiscount   = afterPromo.multiply(vipFraction);
    const total         = afterPromo.subtract(vipDiscount);
    const discountAmt   = promoDiscount.add(vipDiscount);

    return {
      subtotal,
      discountAmt,
      total,
      appliedVip:  isVip && promoDiscountPct > 0,
      discountPct: effectivePct,
    };
  }
}
