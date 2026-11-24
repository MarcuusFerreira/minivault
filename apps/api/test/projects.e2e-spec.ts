import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createTestApp, type TestApp } from './support/app.js';
import { resetDatabase } from './support/database.js';
import { signUp } from './support/users.js';

describe('projects', () => {
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

  const call = (token: string, method: 'get' | 'post' | 'patch' | 'delete', path = '', body?: object) =>
    request(t.http)[method](`/api/v1/projects${path}`).set('Authorization', `Bearer ${token}`).send(body);
  const create = async (token: string, name = 'Payments') => (await call(token, 'post', '', { name }).expect(201)).body.id as string;

  it('creates, reads, updates and deletes', async () => {
    const created = await call(alice, 'post', '', { name: ' Payments ', description: 'Cards' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Payments', description: 'Cards', secretCount: 0 });
    const path = `/${created.body.id as string}`;
    expect((await call(alice, 'get', path)).body).toMatchObject({ name: 'Payments' });
    expect((await call(alice, 'patch', path, { name: 'Billing' })).body).toMatchObject({ name: 'Billing', description: 'Cards' });
    expect((await call(alice, 'get')).body).toHaveLength(1);
    await call(alice, 'delete', path).expect(204);
    await call(alice, 'get', path).expect(404);
    await call(alice, 'delete', path).expect(404);
  });

  it('keeps names unique per owner', async () => {
    await create(alice);
    const duplicate = await call(alice, 'post', '', { name: 'Payments' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('PROJECT_NAME_TAKEN');
    await call(bob, 'post', '', { name: 'Payments' }).expect(201);
    const other = await create(alice, 'Other');
    await call(alice, 'patch', `/${other}`, { name: 'Payments' }).expect(409);
  });

  it('lets exactly one of many simultaneous creations win', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => call(alice, 'post', '', { name: 'Race' })));
    expect(results.map((r) => r.status).sort()).toEqual([201, ...Array<number>(19).fill(409)]);
  });

  it("makes another user's project indistinguishable from a missing one", async () => {
    const id = await create(alice);
    for (const [method, body] of [['get'], ['patch', { name: 'Stolen' }], ['delete']] as const) {
      const foreign = await call(bob, method, `/${id}`, body);
      const missing = await call(bob, method, `/${randomUUID()}`, body);
      expect(foreign.status).toBe(404);
      const strip = (b: { error: object }) => ({ ...b.error, correlationId: '' });
      expect(strip(foreign.body)).toEqual(strip(missing.body));
    }
    expect((await call(bob, 'get')).body).toEqual([]);
    expect((await call(alice, 'get', `/${id}`)).body.name).toBe('Payments');
  });

  it('rejects malformed input', async () => {
    await call(alice, 'get', '/not-a-uuid').expect(400);
    await call(alice, 'post', '', { name: '   ' }).expect(400);
    const id = await create(alice);
    await call(alice, 'patch', `/${id}`, {}).expect(400);
    await call(alice, 'patch', `/${id}`, { ownerId: randomUUID() }).expect(400);
  });
});
