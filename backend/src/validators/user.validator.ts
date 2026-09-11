import { z } from 'zod';

export const userCreateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;
