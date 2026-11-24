import request from 'supertest';
import { seedDemoData } from '../src/seed-demo-data.js';
import { createTestApp, type TestApp } from './support/app.js';
import { resetDatabase } from './support/database.js';

describe('demo data', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await resetDatabase(t.prisma);
  });
  afterAll(() => t.close());

  it('creates a usable account, once', async () => {
    const first = await seedDemoData(t.app, 'a demo password');
    expect(first?.apiKey).toMatch(/^mv_/);
    const counts = async () => Promise.all([t.prisma.user.count(), t.prisma.project.count(), t.prisma.secret.count(), t.prisma.apiKey.count(), t.prisma.auditLog.count()]);
    const before = await counts();
    expect(before.slice(0, 2)).toEqual([1, 2]);
    expect(before[2]).toBeGreaterThan(3);

    expect(await seedDemoData(t.app, 'another password')).toBeNull();
    expect(await counts()).toEqual(before);

    await request(t.http).post('/api/v1/auth/login').send({ email: 'demo@minivault.local', password: 'a demo password' }).expect(200);
    const machine = await request(t.http).get('/api/v1/machine/secrets?environment=PRODUCTION').set('X-API-Key', first?.apiKey ?? '');
    expect(machine.status).toBe(200);
    for (const value of Object.values(machine.body.secrets as Record<string, string>)) expect(value).toMatch(/demo/);
  });
});
