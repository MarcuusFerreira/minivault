import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { EngineProbe } from '../src/shared/infrastructure/health/engine-probe.js';
import { HealthController } from '../src/shared/infrastructure/health/health.controller.js';
import { PrismaContext } from '../src/shared/infrastructure/prisma/prisma-context.js';
import { PrismaService, isUniqueViolation } from '../src/shared/infrastructure/prisma/prisma.service.js';
import { PrismaUnitOfWork } from '../src/shared/infrastructure/prisma/prisma-unit-of-work.js';
import { createTestApp, type TestApp } from './support/app.js';
import { resetDatabase } from './support/database.js';

const user = () => {
  const id = randomUUID();
  return { id, name: 'N', email: `${id}@example.test`, passwordHash: 'x', createdAt: new Date(), updatedAt: new Date() };
};

describe('shared kernel', () => {
  let t: TestApp;
  let context: PrismaContext;
  let unitOfWork: PrismaUnitOfWork;

  beforeAll(async () => {
    t = await createTestApp();
    context = t.app.get(PrismaContext);
    unitOfWork = t.app.get(PrismaUnitOfWork);
  });
  beforeEach(() => resetDatabase(t.prisma));
  afterAll(() => t.close());

  it('rolls back everything when the work throws', async () => {
    await expect(
      unitOfWork.run(async () => {
        await context.client.user.create({ data: user() });
        throw new Error('stop');
      }),
    ).rejects.toThrow('stop');
    expect(await t.prisma.user.count()).toBe(0);
  });

  it('a nested run joins the outer transaction', async () => {
    await expect(
      unitOfWork.run(async () => {
        await unitOfWork.run(() => context.client.user.create({ data: user() }));
        throw new Error('stop');
      }),
    ).rejects.toThrow('stop');
    expect(await t.prisma.user.count()).toBe(0);
  });

  it('commits when the work succeeds', async () => {
    await unitOfWork.run(() => context.client.user.create({ data: user() }));
    expect(await t.prisma.user.count()).toBe(1);
  });

  it('recognizes unique violations', async () => {
    const row = user();
    await t.prisma.user.create({ data: row });
    const error: unknown = await t.prisma.user.create({ data: { ...user(), email: row.email } }).catch((e: unknown) => e);
    expect(isUniqueViolation(error)).toBe(true);
    expect(isUniqueViolation(new Error('x'))).toBe(false);
  });

  it('refuses to change or delete audit entries', async () => {
    const id = randomUUID();
    await t.prisma.auditLog.create({
      data: { id, projectId: randomUUID(), action: 'PROJECT_CREATED', resourceType: 'PROJECT', resourceId: id, metadata: {}, createdAt: new Date() },
    });
    await expect(t.prisma.auditLog.update({ where: { id }, data: { action: 'X' } })).rejects.toThrow(/append-only/);
    await expect(t.prisma.auditLog.delete({ where: { id } })).rejects.toThrow(/append-only/);
  });

  it('enforces constraints the application also checks', async () => {
    const owner = await t.prisma.user.create({ data: user() });
    const project = await t.prisma.project.create({
      data: { id: randomUUID(), name: 'p', description: '', ownerId: owner.id, createdAt: new Date(), updatedAt: new Date() },
    });
    await expect(
      t.prisma.environment.create({ data: { id: randomUUID(), projectId: project.id, name: 'QA', createdAt: new Date() } }),
    ).rejects.toThrow();
  });

  it('answers malformed JSON in the standard error shape with a correlation id', async () => {
    const res = await request(t.http)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .set('X-Correlation-Id', 'test-correlation-1')
      .send('{"value": s3cret');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'BAD_REQUEST', message: expect.any(String), correlationId: 'test-correlation-1' } });
    expect(res.text).not.toContain('s3cret');
    expect(res.headers['x-correlation-id']).toBe('test-correlation-1');
  });

  it('answers oversized bodies in the standard error shape', async () => {
    const res = await request(t.http).post('/api/v1/anything').send({ value: 'x'.repeat(300 * 1024) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('is ready while the database answers', async () => {
    await request(t.http).get('/health').expect(200, { status: 'ok' });
  });

  it('is ready when both dependencies answer', async () => {
    await request(t.http).get('/ready').expect(200, { status: 'ok' });
  });

  it.each(['database', 'engine'])('is not ready, but alive, without the %s', async (down) => {
    const prisma = down === 'database' ? new PrismaService('postgresql://x:x@127.0.0.1:1/x') : t.prisma;
    const engine = { check: () => (down === 'engine' ? Promise.reject(new Error('down')) : Promise.resolve()) };
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: EngineProbe, useValue: engine },
      ],
    }).compile();
    const app = module.createNestApplication();
    await app.init();
    await request(app.getHttpServer()).get('/ready').expect(503);
    await request(app.getHttpServer()).get('/health').expect(200);
    await app.close();
  });
});
