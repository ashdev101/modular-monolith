import { z } from 'zod';

export const DiscountRowSchema = z.object({
  id:          z.string().uuid(),
  code:        z.string(),
  percentage:  z.number(),
  is_active:   z.boolean(),
  expires_at:  z.coerce.date().nullable(),
  max_usage:   z.number().int().nullable(),
  usage_count: z.number().int(),
  created_at:  z.coerce.date(),
});

export type DiscountRow = z.infer<typeof DiscountRowSchema>;
