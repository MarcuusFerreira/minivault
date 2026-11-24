import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { InProcessEventBus } from '../src/shared/infrastructure/events/in-process-event-bus.js';
import { createTestApp, type TestApp } from './support/app.js';
import { resetDatabase } from './support/database.js';
import { signUp } from './support/users.js';

interface Env {
  id: string;
  name: string;
}

describe('environments', () => {
  let t: TestApp;
  let alice: string;
  let bob: string;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(t.prisma);
    alice = (await signUp(t.http, 'alice@example.test')).token;
    bob = (await signUp(t.http, 'bob@example.test')).token;
  });
  afterAll(() => t.close());

  const call = (token: string, method: 'get' | 'post' | 'delete', path: string, body?: object) =>
    request(t.http)[method](`/api/v1/projects${path}`).set('Authorization', `Bearer ${token}`).send(body);
  const project = async (token: string, name = 'P') => (await call(token, 'post', '', { name }).expect(201)).body.id as string;
  const list = async (token: string, id: string) => (await call(token, 'get', `/${id}/environments`).expect(200)).body as Env[];

  it('provisions the standard environments with the project', async () => {
    const id = await project(alice);
    expect((await list(alice, id)).map((e) => e.name)).toEqual(['DEVELOPMENT', 'STAGING', 'PRODUCTION']);
    expect((await call(alice, 'get', `/${id}`)).body.environmentCount).toBe(3);
  });

  it('creates no project when provisioning fails', async () => {
    const broken = await createTestApp();
    try {
      broken.app.get(InProcessEventBus).subscribe({ handles: ['ProjectCreated'], handle: () => Promise.reject(new Error('boom')) });
      await request(broken.http).post('/api/v1/projects').set('Authorization', `Bearer ${alice}`).send({ name: 'P' }).expect(500);
      expect(await t.prisma.project.count()).toBe(0);
      expect(await t.prisma.environment.count()).toBe(0);
    } finally {
      await broken.close();
    }
  });

  it('deletes and recreates an environment', async () => {
    const id = await project(alice);
    const staging = (await list(alice, id)).find((e) => e.name === 'STAGING');
    await call(alice, 'delete', `/${id}/environments/${staging?.id}`).expect(204);
    await call(alice, 'get', `/${id}/environments/${staging?.id}`).expect(404);
    await call(alice, 'post', `/${id}/environments`, { name: 'STAGING' }).expect(201);
    const duplicate = await call(alice, 'post', `/${id}/environments`, { name: 'STAGING' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('ENVIRONMENT_EXISTS');
    await call(alice, 'post', `/${id}/environments`, { name: 'QA' }).expect(400);
    expect((await list(alice, id)).map((e) => e.name)).toEqual(['DEVELOPMENT', 'STAGING', 'PRODUCTION']);
  });

  it('does not resolve an environment through another project of the same owner', async () => {
    const [first, second] = [await project(alice, 'A'), await project(alice, 'B')];
    const foreign = (await list(alice, second))[0]?.id;
    await call(alice, 'get', `/${first}/environments/${foreign}`).expect(404);
    await call(alice, 'delete', `/${first}/environments/${foreign}`).expect(404);
    expect(await list(alice, second)).toHaveLength(3);
  });

  it('hides everything from other users', async () => {
    const id = await project(alice);
    const env = (await list(alice, id))[0]?.id;
    await call(bob, 'get', `/${id}/environments`).expect(404);
    await call(bob, 'post', `/${id}/environments`, { name: 'STAGING' }).expect(404);
    await call(bob, 'get', `/${id}/environments/${env}`).expect(404);
    await call(bob, 'delete', `/${id}/environments/${env}`).expect(404);
    await call(alice, 'get', `/${randomUUID()}/environments`).expect(404);
    expect(await list(alice, id)).toHaveLength(3);
  });
});
