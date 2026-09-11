import { NextFunction, Request, Response } from 'express';
import * as service from '../services/challan.service';
import { challanInputSchema } from '../validators/challan.validator';

function idOf(request: Request): number | null {
  const id = Number(request.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function paginationQuery(request: Request) {
  return {
    page: Math.max(1, Number(request.query.page) || 1),
    limit: Math.min(100, Math.max(1, Number(request.query.limit) || 10)),
  };
}

export async function create(request: Request, response: Response, next: NextFunction) {
  const validation = challanInputSchema.safeParse(request.body);
  if (!validation.success) {
    response.status(400).json({
      success: false,
      message: 'Invalid challan data',
      error: validation.error.flatten().fieldErrors,
    });
    return;
  }
  try {
    const result = await service.createChallan(validation.data, request.user!.userId);
    if (result.kind === 'customer_not_found') {
      response.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }
    if (result.kind === 'product_not_found') {
      response.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    response.status(201).json({
      success: true,
      message: 'Sales challan created successfully',
      data: { challan: result.challan, items: result.items },
    });
  } catch (error) {
    next(error);
  }
}

export async function list(request: Request, response: Response, next: NextFunction) {
  try {
    const { page, limit } = paginationQuery(request);
    const customerId = request.query.customerId ? Number(request.query.customerId) : undefined;
    if (request.query.customerId && (!customerId || !Number.isInteger(customerId))) {
      response.status(400).json({ success: false, message: 'Invalid customer ID' });
      return;
    }
    const status = request.query.status?.toString();
    if (status && !['DRAFT', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      response.status(400).json({ success: false, message: 'Invalid challan status' });
      return;
    }
    const result = await service.listChallans({
      search: request.query.search?.toString(),
      status,
      customerId,
      page,
      limit,
    });
    response.json({
      success: true,
      message: 'Sales challans retrieved successfully',
      data: result.rows,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function get(request: Request, response: Response, next: NextFunction) {
  try {
    const id = idOf(request);
    if (!id) {
      response.status(400).json({ success: false, message: 'Invalid challan ID' });
      return;
    }
    const result = await service.getChallan(id);
    if (!result) {
      response.status(404).json({ success: false, message: 'Sales challan not found' });
      return;
    }
    response.json({ success: true, message: 'Sales challan retrieved successfully', data: result });
  } catch (error) {
    next(error);
  }
}

export async function update(request: Request, response: Response, next: NextFunction) {
  const id = idOf(request);
  const validation = challanInputSchema.safeParse(request.body);
  if (!id) {
    response.status(400).json({ success: false, message: 'Invalid challan ID' });
    return;
  }
  if (!validation.success) {
    response.status(400).json({
      success: false,
      message: 'Invalid challan data',
      error: validation.error.flatten().fieldErrors,
    });
    return;
  }
  try {
    const result = await service.updateChallan(id, validation.data);
    if (result.kind === 'challan_not_found') {
      response.status(404).json({ success: false, message: 'Sales challan not found' });
      return;
    }
    if (result.kind === 'not_editable') {
      response.status(409).json({
        success: false,
        message: 'Cancelled or confirmed challans cannot be updated',
      });
      return;
    }
    if (result.kind === 'customer_not_found') {
      response.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }
    if (result.kind === 'product_not_found') {
      response.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    response.json({
      success: true,
      message: 'Sales challan updated successfully',
      data: result.result,
    });
  } catch (error) {
    next(error);
  }
}

export async function confirm(request: Request, response: Response, next: NextFunction) {
  try {
    const id = idOf(request);
    if (!id) {
      response.status(400).json({ success: false, message: 'Invalid challan ID' });
      return;
    }

    const result = await service.confirmChallan(id, request.user!.userId);
    if (result.kind === 'challan_not_found') {
      response.status(404).json({ success: false, message: 'Sales challan not found' });
      return;
    }
    if (result.kind === 'not_confirmable') {
      response.status(409).json({
        success: false,
        message: `Only draft challans can be confirmed. Current status: ${result.status}`,
      });
      return;
    }
    if (result.kind === 'empty_challan') {
      response.status(400).json({ success: false, message: 'Cannot confirm an empty challan' });
      return;
    }
    if (result.kind === 'product_not_found') {
      response.status(404).json({
        success: false,
        message: 'Product not found',
        error: { productId: result.productId },
      });
      return;
    }
    if (result.kind === 'insufficient_stock') {
      response.status(409).json({
        success: false,
        message: 'Insufficient stock',
        error: {
          productId: result.productId,
          available: result.available,
          requested: result.requested,
        },
      });
      return;
    }
    response.json({
      success: true,
      message: 'Sales challan confirmed successfully',
      data: result.challan,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancel(request: Request, response: Response, next: NextFunction) {
  try {
    const id = idOf(request);
    if (!id) {
      response.status(400).json({ success: false, message: 'Invalid challan ID' });
      return;
    }
    const result = await service.cancelChallan(id, request.user!.userId, request.user!.role);
    if (result.kind === 'challan_not_found') {
      response.status(404).json({ success: false, message: 'Challan not found' });
      return;
    }
    if (result.kind === 'already_cancelled') {
      response.status(409).json({ success: false, message: 'Challan is already cancelled' });
      return;
    }
    if (result.kind === 'invalid_state') {
      response.status(409).json({
        success: false,
        message: `Challan cannot be cancelled from status ${result.status}`,
      });
      return;
    }
    if (result.kind === 'forbidden_confirmed') {
      response.status(403).json({
        success: false,
        message: 'Only ADMIN can cancel a confirmed challan',
      });
      return;
    }
    if (result.kind === 'product_not_found') {
      response.status(404).json({
        success: false,
        message: 'Product not found',
        error: { productId: result.productId },
      });
      return;
    }
    response.json({
      success: true,
      message: 'Sales challan cancelled successfully',
      data: result.challan,
    });
  } catch (error) {
    next(error);
  }
}
