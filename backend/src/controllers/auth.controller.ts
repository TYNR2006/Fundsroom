import { NextFunction, Request, Response } from 'express';
import { authenticateUser } from '../services/auth.service';
import { loginSchema } from '../validators/auth.validator';

export async function login(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validation = loginSchema.safeParse(request.body);

  if (!validation.success) {
    response.status(400).json({
      success: false,
      message: 'Invalid login data',
      error: validation.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const result = await authenticateUser(validation.data);

    if (!result) {
      response.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    response.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export function currentUser(request: Request, response: Response): void {
  response.json({
    success: true,
    message: 'Authenticated user retrieved',
    data: request.user,
  });
}
