import { z } from 'zod';

const customerType = z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']);
const customerStatus = z.enum(['LEAD', 'ACTIVE', 'INACTIVE']);

export const customerCreateSchema = z.object({
  customer_name: z.string().trim().min(1).max(150),
  mobile: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(255).optional().nullable(),
  business_name: z.string().trim().min(1).max(150),
  gst_number: z.string().trim().max(15).optional().nullable(),
  customer_type: customerType,
  address: z.string().trim().min(1),
  status: customerStatus.default('LEAD'),
  follow_up_date: z.coerce.date().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const followUpSchema = z.object({
  follow_up_date: z.coerce.date(),
  note: z.string().trim().min(1),
});
