import { z } from 'zod';

export const CustomerRowSchema = z.object({
  id:             z.string().uuid(),
  name:           z.string(),
  email:          z.string(),
  is_vip:         z.boolean(),
  vip_granted_at: z.coerce.date().nullable(),
  created_at:     z.coerce.date(),
});

export type CustomerRow = z.infer<typeof CustomerRowSchema>;
