import { z } from 'zod';

export const CreateDiscountBodySchema = z.object({
  code:       z.string().min(1).max(50).toUpperCase(),
  percentage: z.number()
               .int('Percentage must be an integer')
               .min(1, 'Minimum 1%')
               .max(100, 'Maximum 100%'),
  expiresAt:  z.string().datetime({ message: 'expiresAt must be an ISO 8601 datetime' }).optional(),
  maxUsage:   z.number().int().positive('maxUsage must be a positive integer').optional(),
});

export type CreateDiscountBody = z.infer<typeof CreateDiscountBodySchema>;
