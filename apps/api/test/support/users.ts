import type { Server } from 'node:http';
import request from 'supertest';

export const PASSWORD = 'correct horse battery';

export async function signUp(http: Server, email: string): Promise<{ token: string; userId: string }> {
  const created = await request(http).post('/api/v1/auth/register').send({ name: 'Test', email, password: PASSWORD }).expect(201);
  const login = await request(http).post('/api/v1/auth/login').send({ email, password: PASSWORD }).expect(200);
  return { token: login.body.accessToken as string, userId: created.body.id as string };
}
