import { NextFunction, Request, Response } from 'express';
import * as service from '../services/product.service';
import {
  productCreateSchema,
  productUpdateSchema,
  stockOperationSchema,
} from '../validators/product.validator';

function productId(request: Request): number | null {
  const id = Number(request.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function paginationQuery(request: Request) {
  return {
    page: Math.max(1, Number(request.query.page) || 1),
    limit: Math.min(100, Math.max(1, Number(request.query.limit) || 10)),
  };
}

function isDuplicateSku(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export async function list(request: Request, response: Response, next: NextFunction) {
  try {
    const { page, limit } = paginationQuery(request);
    const result = await service.listProducts({
      search: request.query.search?.toString(),
      category: request.query.category?.toString(),
      lowStock: request.query.lowStock === 'true',
      page,
      limit,
    });
    response.json({
      success: true,
      message: 'Products retrieved successfully',
      data: result.rows,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function get(request: Request, response: Response, next: NextFunction) {
  try {
    const id = productId(request);
    if (!id) {
      response.status(400).json({ success: false, message: 'Invalid product ID' });
      return;
    }
    const product = await service.getProduct(id);
    if (!product) {
      response.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    response.json({ success: true, message: 'Product retrieved successfully', data: product });
  } catch (error) {
    next(error);
  }
}

export async function create(request: Request, response: Response, next: NextFunction) {
  const validation = productCreateSchema.safeParse(request.body);
  if (!validation.success) {
    response.status(400).json({
      success: false,
      message: 'Invalid product data',
      error: validation.error.flatten().fieldErrors,
    });
    return;
  }
  try {
    const product = await service.createProduct(validation.data);
    response.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    if (isDuplicateSku(error)) {
      response.status(409).json({ success: false, message: 'SKU already exists' });
      return;
    }
    next(error);
  }
}

export async function update(request: Request, response: Response, next: NextFunction) {
  const id = productId(request);
  const validation = productUpdateSchema.safeParse(request.body);
  if (!id) {
    response.status(400).json({ success: false, message: 'Invalid product ID' });
    return;
  }
  if (!validation.success) {
    response.status(400).json({
      success: false,
      message: 'Invalid product data',
      error: validation.error.flatten().fieldErrors,
    });
    return;
  }
  try {
    const product = await service.updateProduct(id, validation.data);
    if (!product) {
      response.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    response.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) {
    if (isDuplicateSku(error)) {
      response.status(409).json({ success: false, message: 'SKU already exists' });
      return;
    }
    next(error);
  }
}

async function adjust(request: Request, response: Response, next: NextFunction, type: 'IN' | 'OUT') {
  const id = productId(request);
  const validation = stockOperationSchema.safeParse(request.body);
  if (!id) {
    response.status(400).json({ success: false, message: 'Invalid product ID' });
    return;
  }
  if (!validation.success) {
    response.status(400).json({
      success: false,
      message: 'Invalid stock operation',
      error: validation.error.flatten().fieldErrors,
    });
    return;
  }
  try {
    const result = await service.adjustStock(
      id,
      validation.data.quantity,
      type,
      validation.data.reason,
      request.user!.userId,
    );
    if (result.kind === 'not_found') {
      response.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    if (result.kind === 'insufficient_stock') {
      response.status(409).json({
        success: false,
        message: 'Insufficient stock',
        error: { available: result.available, requested: result.requested },
      });
      return;
    }
    response.json({
      success: true,
      message: `Stock ${type === 'IN' ? 'added' : 'removed'} successfully`,
      data: result.product,
    });
  } catch (error) {
    next(error);
  }
}

export function addStock(request: Request, response: Response, next: NextFunction) {
  return adjust(request, response, next, 'IN');
}

export function removeStock(request: Request, response: Response, next: NextFunction) {
  return adjust(request, response, next, 'OUT');
}

export async function movements(request: Request, response: Response, next: NextFunction) {
  try {
    const id = productId(request);
    if (!id || !(await service.getProduct(id))) {
      response.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    const { page, limit } = paginationQuery(request);
    const result = await service.listMovements({ productId: id, page, limit });
    response.json({ success: true, message: 'Stock movements retrieved successfully', data: result.rows, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function listMovements(request: Request, response: Response, next: NextFunction) {
  try {
    const { page, limit } = paginationQuery(request);
    const productIdQuery = request.query.productId?.toString();
    const productIdValue = productIdQuery ? Number(productIdQuery) : undefined;
    const movementType = request.query.movementType?.toString();
    if (productIdQuery && (!productIdValue || !Number.isInteger(productIdValue))) {
      response.status(400).json({ success: false, message: 'Invalid product ID' });
      return;
    }
    if (movementType && movementType !== 'IN' && movementType !== 'OUT') {
      response.status(400).json({ success: false, message: 'Invalid movement type' });
      return;
    }
    const result = await service.listMovements({
      productId: productIdValue,
      movementType: movementType as 'IN' | 'OUT' | undefined,
      page,
      limit,
    });
    response.json({
      success: true,
      message: 'Stock movements retrieved successfully',
      data: result.rows,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}
