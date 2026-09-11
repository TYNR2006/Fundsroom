import { z } from 'zod';

const challanItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
});

export const challanInputSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  items: z.array(challanItemSchema).min(1),
}).superRefine((value, context) => {
  const productIds = value.items.map((item) => item.productId);
  if (new Set(productIds).size !== productIds.length) {
    context.addIssue({
      code: 'custom',
      path: ['items'],
      message: 'Duplicate product IDs are not allowed in a challan',
    });
  }
});

export type ChallanInput = z.infer<typeof challanInputSchema>;
