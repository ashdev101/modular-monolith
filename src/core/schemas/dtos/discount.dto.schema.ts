import { z } from 'zod';

export const DiscountDTOSchema = z.object({
  code:       z.string().min(1).max(50),
  percentage: z.number().min(0).max(100),
  isActive:   z.boolean(),
  expiresAt:  z.string().datetime().nullable(),
  usageCount: z.number().int().nonnegative(),
  maxUsage:   z.number().int().positive().nullable(),
});

export type DiscountDTO = z.infer<typeof DiscountDTOSchema>;
