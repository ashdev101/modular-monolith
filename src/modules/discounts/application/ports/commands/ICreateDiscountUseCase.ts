export interface CreateDiscountCommand {
  code:       string;
  percentage: number;
  expiresAt?: string | null;
  maxUsage?:  number | null;
}

export interface CreateDiscountResult {
  code:       string;
  percentage: number;
  expiresAt:  string | null;
  maxUsage:   number | null;
}

export interface ICreateDiscountUseCase {
  execute(cmd: CreateDiscountCommand): Promise<CreateDiscountResult>;
}
