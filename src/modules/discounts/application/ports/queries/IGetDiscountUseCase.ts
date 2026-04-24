export interface GetDiscountQuery {
  code: string;
}

export interface DiscountView {
  code:       string;
  percentage: number;
  isActive:   boolean;
  isExpired:  boolean;
  expiresAt:  string | null;
  maxUsage:   number | null;
  usageCount: number;
}

export interface IGetDiscountUseCase {
  execute(query: GetDiscountQuery): Promise<DiscountView>;
}
