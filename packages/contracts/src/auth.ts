import { z } from 'zod';

export const registerRequest = z.strictObject({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().max(254).pipe(z.email()),
  password: z.string().min(12).max(128),
});
export type RegisterRequest = z.infer<typeof registerRequest>;

export const loginRequest = z.strictObject({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof loginRequest>;

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserResponse;
}
