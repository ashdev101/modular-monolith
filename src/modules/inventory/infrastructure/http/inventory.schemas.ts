import { z } from 'zod';

export const AddProductBodySchema = z.object({
  productName: z.string().min(1, 'Product name cannot be empty').max(200),
  unitPrice:   z.number().int('Unit price must be an integer (cents)').nonnegative(),
  quantity:    z.number().int().nonnegative('Quantity cannot be negative'),
});
export type AddProductBody = z.infer<typeof AddProductBodySchema>;

export const UpdateStockBodySchema = z.object({
  productName: z.string().min(1, 'Product name cannot be empty').max(200),
  unitPrice:   z.number().int('Unit price must be an integer (cents)').positive('Unit price must be positive'),
});
export type UpdateStockBody = z.infer<typeof UpdateStockBodySchema>;
