import { NextFunction, Request, Response } from 'express';
import * as service from '../services/customer.service';
import { customerCreateSchema, customerUpdateSchema, followUpSchema } from '../validators/customer.validator';

function idOf(request: Request): number | null {
  const id = Number(request.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function list(request: Request, response: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 10));
    const result = await service.listCustomers({
      search: request.query.search?.toString(), status: request.query.status?.toString(),
      customerType: request.query.customer_type?.toString(), page, limit,
    });
    response.json({ success: true, message: 'Customers retrieved', data: result.rows, pagination: result.pagination });
  } catch (error) { next(error); }
}

export async function get(request: Request, response: Response, next: NextFunction) {
  try {
    const id = idOf(request);
    if (!id) { response.status(400).json({ success: false, message: 'Invalid customer ID' }); return; }
    const customer = await service.getCustomer(id);
    if (!customer) { response.status(404).json({ success: false, message: 'Customer not found' }); return; }
    response.json({ success: true, data: customer });
  } catch (error) { next(error); }
}

export async function create(request: Request, response: Response, next: NextFunction) {
  const validation = customerCreateSchema.safeParse(request.body);
  if (!validation.success) { response.status(400).json({ success: false, message: 'Invalid customer data', error: validation.error.flatten().fieldErrors }); return; }
  try { response.status(201).json({ success: true, message: 'Customer created successfully', data: await service.createCustomer(validation.data) }); }
  catch (error) { next(error); }
}

export async function update(request: Request, response: Response, next: NextFunction) {
  const id = idOf(request);
  const validation = customerUpdateSchema.safeParse(request.body);
  if (!id) { response.status(400).json({ success: false, message: 'Invalid customer ID' }); return; }
  if (!validation.success) { response.status(400).json({ success: false, message: 'Invalid customer data', error: validation.error.flatten().fieldErrors }); return; }
  try {
    const customer = await service.updateCustomer(id, validation.data);
    if (!customer) { response.status(404).json({ success: false, message: 'Customer not found' }); return; }
    response.json({ success: true, message: 'Customer updated successfully', data: customer });
  } catch (error) { next(error); }
}

export async function followUps(request: Request, response: Response, next: NextFunction) {
  try {
    const id = idOf(request);
    if (!id || !(await service.getCustomer(id))) { response.status(404).json({ success: false, message: 'Customer not found' }); return; }
    response.json({ success: true, data: await service.listFollowUps(id) });
  } catch (error) { next(error); }
}

export async function addFollowUp(request: Request, response: Response, next: NextFunction) {
  const id = idOf(request);
  const validation = followUpSchema.safeParse(request.body);
  if (!id) { response.status(400).json({ success: false, message: 'Invalid customer ID' }); return; }
  if (!validation.success) { response.status(400).json({ success: false, message: 'Invalid follow-up data', error: validation.error.flatten().fieldErrors }); return; }
  try {
    if (!(await service.getCustomer(id))) { response.status(404).json({ success: false, message: 'Customer not found' }); return; }
    response.status(201).json({ success: true, message: 'Follow-up created successfully', data: await service.createFollowUp(id, request.user!.userId, validation.data) });
  } catch (error) { next(error); }
}
