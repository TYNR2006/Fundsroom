import { z } from 'zod';

export const productCreateSchema = z.object({
  product_name: z.string().trim().min(1).max(150),
  sku: z.string().trim().min(1).max(50),
  category: z.string().trim().min(1).max(100),
  unit_price: z.coerce.number().min(0),
  current_stock: z.coerce.number().int().min(0),
  minimum_stock_quantity: z.coerce.number().int().min(0),
  warehouse_location: z.string().trim().min(1).max(100),
});

export const productUpdateSchema = productCreateSchema
  .omit({ current_stock: true })
  .partial();

export const stockOperationSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1).max(255),
});
