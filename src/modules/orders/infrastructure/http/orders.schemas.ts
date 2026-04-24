import { z } from 'zod';

export const CreateOrderItemSchema = z.object({
  productId: z.string().uuid({ message: 'productId must be a valid UUID' }),
  quantity:  z.number({ invalid_type_error: 'quantity must be a number' })
              .int('quantity must be an integer')
              .positive('quantity must be greater than 0'),
});

export const CreateOrderBodySchema = z.object({
  customerId:   z.string().uuid({ message: 'customerId must be a valid UUID' }),
  items:        z.array(CreateOrderItemSchema)
                 .min(1, 'At least one item is required')
                 .max(50, 'Maximum 50 items per order'),
  discountCode: z.string().min(1).max(50).toUpperCase().optional(),
});

export type CreateOrderBody = z.infer<typeof CreateOrderBodySchema>;

export const CancelOrderBodySchema = z.object({
  reason: z.string().min(1, 'Reason cannot be empty').max(500).optional(),
});

export type CancelOrderBody = z.infer<typeof CancelOrderBodySchema>;
