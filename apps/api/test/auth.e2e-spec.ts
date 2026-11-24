import { Controller, HttpCode, Post } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, type TestApp } from './support/app.js';
import { resetDatabase } from './support/database.js';
import { PASSWORD, signUp } from './support/users.js';

const ORIGIN = 'http://localhost:8080';

/** A protected state-changing route that exists only in this test. */
@Controller('auth/session/probe')
class ProbeController {
  @Post()
  @HttpCode(204)
  change(): void {}
}

describe('authentication', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp(undefined, [ProbeController]);
  });
  beforeEach(() => resetDatabase(t.prisma));
  afterAll(() => t.close());

  const post = (path: string, body?: object) => request(t.http).post(`/api/v1/auth/${path}`).send(body);
  const me = () => request(t.http).get('/api/v1/auth/me');
  const account = { name: 'Ana', email: 'ana@example.test', password: PASSWORD };

  it('registers and logs in without ever returning a hash', async () => {
    const created = await post('register', account);
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ id: expect.any(String), name: 'Ana', email: 'ana@example.test', createdAt: expect.any(String) });
    const login = await post('login', { email: 'ANA@example.test', password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 1800, user: created.body });
    expect(login.headers['cache-control']).toBe('no-store');
    expect(created.text + login.text).not.toContain('argon2');
  });

  it('rejects an email already registered in another case', async () => {
    await post('register', account).expect(201);
    const res = await post('register', { ...account, email: 'ANA@Example.test' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('lets exactly one of many simultaneous registrations win', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => post('register', account)));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, ...Array<number>(19).fill(409)]);
  });

  it.each([
    [{ ...account, password: 'short' }, 'password'],
    [{ ...account, email: 'nope' }, 'email'],
    [{ ...account, role: 'admin' }, ''],
  ])('validates registration input %#', async (body, path) => {
    const res = await post('register', body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe(path);
  });

  it('answers wrong password and unknown email identically', async () => {
    await post('register', account).expect(201);
    const wrong = await post('login', { email: account.email, password: 'wrong password!' });
    const unknown = await post('login', { email: 'nobody@example.test', password: 'wrong password!' });
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    const strip = (b: { error: object }) => ({ ...b.error, correlationId: '' });
    expect(strip(wrong.body)).toEqual(strip(unknown.body));
  });

  it('protects routes by default', async () => {
    const res = await me();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    await me().set('Authorization', 'Bearer nonsense').expect(401);
    await me().set('Authorization', 'Basic abc').expect(401);
  });

  it('accepts a token until the user disappears', async () => {
    const { token, userId } = await signUp(t.http, 'ana@example.test');
    await me().set('Authorization', `Bearer ${token}`).expect(200);
    await t.prisma.user.delete({ where: { id: userId } });
    await me().set('Authorization', `Bearer ${token}`).expect(401);
  });

  describe('browser session', () => {
    async function openSession(): Promise<string> {
      await post('register', account).expect(201);
      const res = await post('session', { email: account.email, password: PASSWORD });
      expect(res.status).toBe(200);
      expect(Object.keys(res.body)).toEqual(['user']);
      const cookie = (res.headers['set-cookie'] as unknown as string[])[0] ?? '';
      expect(cookie).toMatch(/^minivault_session=/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/api/);
      expect(cookie).not.toMatch(/Secure/);
      expect(cookie).toMatch(/Max-Age=1800/);
      return cookie.split(';')[0] ?? '';
    }

    it('keeps the token out of reach of scripts', async () => {
      const cookie = await openSession();
      await me().set('Cookie', cookie).expect(200);
    });

    it('rejects state changes without the expected origin', async () => {
      const cookie = await openSession();
      const change = () => request(t.http).post('/api/v1/auth/session/probe').set('Cookie', cookie);
      expect((await change()).body.error.code).toBe('CSRF_REJECTED');
      expect((await change().set('Origin', 'https://evil.test')).body.error.code).toBe('CSRF_REJECTED');
      expect((await change().set('Origin', ORIGIN)).status).toBe(204);
    });

    it('never falls back from an invalid bearer token to the cookie', async () => {
      const cookie = await openSession();
      await me().set('Cookie', cookie).set('Authorization', 'Bearer nonsense').expect(401);
    });

    it('closes the session', async () => {
      const res = await request(t.http).delete('/api/v1/auth/session').expect(204);
      expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(/minivault_session=;.*Expires=Thu, 01 Jan 1970/);
    });
  });

  it('limits login attempts', async () => {
    process.env.AUTH_THROTTLE_LIMIT = '5';
    const limited = await createTestApp();
    try {
      const attempt = () => request(limited.http).post('/api/v1/auth/login').send({ email: 'x@example.test', password: 'wrong password!' });
      for (let i = 0; i < 5; i += 1) expect((await attempt()).status).toBe(401);
      const blocked = await attempt();
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    } finally {
      process.env.AUTH_THROTTLE_LIMIT = '100000';
      await limited.close();
    }
  });

  it('sends security headers and refuses foreign origins', async () => {
    const res = await request(t.http).get('/health').set('Origin', 'https://evil.test');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.test');
  });
});
