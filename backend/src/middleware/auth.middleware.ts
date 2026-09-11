import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedUser } from '../types/auth';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const authorizationHeader = request.header('authorization');
  const [scheme, token] = authorizationHeader?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    response.status(401).json({
      success: false,
      message: 'Authentication token is required',
    });
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());

    if (typeof payload !== 'object' || payload === null) {
      response.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
      return;
    }

    const { userId, name, email, role } = payload as Partial<AuthenticatedUser>;
    if (
      typeof userId !== 'number' ||
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof role !== 'string'
    ) {
      response.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
      return;
    }

    request.user = { userId, name, email, role };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      response.status(401).json({
        success: false,
        message: 'Authentication token has expired',
      });
      return;
    }

    response.status(401).json({
      success: false,
      message: 'Invalid authentication token',
    });
  }
}
