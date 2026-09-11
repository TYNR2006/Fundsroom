import { NextFunction, Request, Response } from 'express';

export function requireRole(...allowedRoles: string[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      response.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    next();
  };
}
