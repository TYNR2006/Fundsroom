import { NextFunction, Request, Response } from 'express';
import * as service from '../services/dashboard.service';

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function summary(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json({
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data: await service.getSummary(),
    });
  } catch (error) {
    next(error);
  }
}

export async function inventory(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json({
      success: true,
      message: 'Inventory dashboard retrieved successfully',
      data: await service.getInventory(),
    });
  } catch (error) {
    next(error);
  }
}

export async function challans(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json({
      success: true,
      message: 'Challan dashboard retrieved successfully',
      data: await service.getChallans(),
    });
  } catch (error) {
    next(error);
  }
}

export async function activity(request: Request, response: Response, next: NextFunction) {
  const from = request.query.from?.toString();
  const to = request.query.to?.toString();
  if ((from && !validDate(from)) || (to && !validDate(to))) {
    response.status(400).json({
      success: false,
      message: 'Date filters must use YYYY-MM-DD format',
    });
    return;
  }
  if (from && to && from > to) {
    response.status(400).json({
      success: false,
      message: 'The from date cannot be after the to date',
    });
    return;
  }
  try {
    response.json({
      success: true,
      message: 'Dashboard activity retrieved successfully',
      data: await service.getActivity(from, to),
    });
  } catch (error) {
    next(error);
  }
}

