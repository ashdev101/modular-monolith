import { z } from 'zod';

export const StockRowSchema = z.object({
  id:           z.string().uuid(),
  product_name: z.string(),
  unit_price:   z.number().int(),
  quantity:     z.number().int(),
  created_at:   z.coerce.date(),
});

export type StockRow = z.infer<typeof StockRowSchema>;
