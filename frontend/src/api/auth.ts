import { apiRequest } from './client';
import type { LoginResponse, User } from '../types/auth';

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser(): Promise<User> {
  return apiRequest<User>('/auth/me');
}
