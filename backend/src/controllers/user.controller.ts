import { NextFunction, Request, Response } from 'express';
import * as service from '../services/user.service';
import { userCreateSchema } from '../validators/user.validator';

export async function list(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ success: true, message: 'Users retrieved successfully', data: await service.listUsers() });
  } catch (error) { next(error); }
}

export async function create(request: Request, response: Response, next: NextFunction) {
  const validation = userCreateSchema.safeParse(request.body);
  if (!validation.success) {
    response.status(400).json({ success: false, message: 'Invalid user data', error: validation.error.flatten().fieldErrors });
    return;
  }
  try {
    const user = await service.createUser(validation.data);
    if (!user) {
      response.status(400).json({ success: false, message: 'Selected role does not exist' });
      return;
    }
    response.status(201).json({ success: true, message: 'User created successfully', data: user });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      response.status(409).json({ success: false, message: 'Email is already registered' });
      return;
    }
    next(error);
  }
}
