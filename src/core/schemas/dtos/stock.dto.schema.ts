import { z } from 'zod';

export const StockDTOSchema = z.object({
  productId:    z.string().uuid(),
  productName:  z.string().min(1),
  unitPrice:    z.number().int().nonnegative(),  // cents — int enforced
  quantity:     z.number().int().nonnegative(),
  reservedQty:  z.number().int().nonnegative(),
  availableQty: z.number().int().nonnegative(),
});

export type StockDTO = z.infer<typeof StockDTOSchema>;
