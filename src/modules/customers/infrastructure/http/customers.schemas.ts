import { z } from 'zod';

export const RegisterCustomerBodySchema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email format').toLowerCase(),
});

export type RegisterCustomerBody = z.infer<typeof RegisterCustomerBodySchema>;
