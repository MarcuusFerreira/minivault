import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { ConsoleLogger } from '@nestjs/common';
import { createTestApp, type TestApp } from './support/app.js';
import { resetDatabase } from './support/database.js';
import { captureOutput } from './support/logs.js';
import { createProject, type TestProject } from './support/projects.js';
import { signUp } from './support/users.js';

describe('api keys', () => {
  let t: TestApp;
  let alice: string;
  let bob: string;
  let project: TestProject;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(t.prisma);
    alice = (await signUp(t.http, 'alice@example.test')).token;
    bob = (await signUp(t.http, 'bob@example.test')).token;
    project = await createProject(t.http, alice);
  });
  afterAll(() => t.close());

  const call = (token: string, method: 'get' | 'post' | 'delete', path = '', body?: object, id = project.id) =>
    request(t.http)[method](`/api/v1/projects/${id}/api-keys${path}`).set('Authorization', `Bearer ${token}`).send(body);
  const body = (overrides: object = {}) => ({
    name: 'CI',
    expiresAt: null,
    grants: [{ environmentId: project.environments.PRODUCTION, permissions: ['SECRETS_READ'] }],
    ...overrides,
  });
  const generate = async () => (await call(alice, 'post', '', body()).expect(201)).body as { id: string; plaintext: string; prefix: string };
  const asKey = (key: string, path: string) => request(t.http).get(path).set('X-API-Key', key);

  it('shows the plaintext exactly once', async () => {
    const created = await call(alice, 'post', '', body());
    expect(created.headers['cache-control']).toBe('no-store');
    const { plaintext, ...metadata } = created.body as { plaintext: string };
    expect(plaintext).toMatch(/^mv_/);
    expect(metadata).toMatchObject({ name: 'CI', status: 'active', lastUsedAt: null, revokedAt: null, expiresAt: null });
    const list = await call(alice, 'get');
    expect(list.body).toEqual([metadata]);
    const [raw] = await t.prisma.$queryRaw<{ text: string }[]>`
      SELECT (SELECT string_agg(k::text, '') FROM api_keys k) || (SELECT string_agg(a::text, '') FROM audit_logs a) AS text`;
    expect(raw?.text).not.toContain(plaintext);
    expect(list.text).not.toMatch(/hash/i);
  });

  it('authenticates, then stops at revocation', async () => {
    const key = await generate();
    await asKey(key.plaintext, project.secretsPath()).expect(200);
    const used = await t.prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } });
    expect(used.lastUsedAt).not.toBeNull();
    await asKey(key.plaintext, project.secretsPath()).expect(200);
    expect((await t.prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } })).lastUsedAt).toEqual(used.lastUsedAt);

    await call(alice, 'delete', `/${key.id}`).expect(204);
    await asKey(key.plaintext, project.secretsPath()).expect(401);
    expect((await call(alice, 'get')).body[0]).toMatchObject({ status: 'revoked', revokedAt: expect.any(String) });
    const again = await call(alice, 'delete', `/${key.id}`);
    expect([again.status, again.body.error.code]).toEqual([409, 'API_KEY_ALREADY_REVOKED']);
  });

  it('rotates', async () => {
    const old = await generate();
    const rotated = await call(alice, 'post', `/${old.id}/rotate`);
    expect(rotated.status).toBe(201);
    expect(rotated.headers['cache-control']).toBe('no-store');
    await asKey(old.plaintext, project.secretsPath()).expect(401);
    await asKey(rotated.body.plaintext as string, project.secretsPath()).expect(200);
    await call(alice, 'post', `/${old.id}/rotate`).expect(409);
  });

  it('rotates once when asked twice at the same time', async () => {
    const old = await generate();
    const results = await Promise.all([1, 2, 3, 4].map(() => call(alice, 'post', `/${old.id}/rotate`)));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409, 409]);
    const active = await t.prisma.apiKey.count({ where: { revokedAt: null } });
    expect(active).toBe(1);
  });

  it('rejects expired keys', async () => {
    const key = await generate();
    await t.prisma.apiKey.update({ where: { id: key.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await asKey(key.plaintext, project.secretsPath()).expect(401);
    expect((await call(alice, 'get')).body[0].status).toBe('expired');
  });

  it.each([
    ['past expiry', { expiresAt: '2020-01-01T00:00:00Z' }],
    ['no grants', { grants: [] }],
    ['unknown permission', { grants: [{ environmentId: randomUUID(), permissions: ['ADMIN'] }] }],
    ['blank name', { name: ' ' }],
  ])('rejects %s', async (_name, overrides) => {
    await call(alice, 'post', '', body(overrides)).expect(400);
  });

  it("cannot be granted another project's environment", async () => {
    const other = await createProject(t.http, alice, 'Other');
    const res = await call(alice, 'post', '', body({ grants: [{ environmentId: other.environments.PRODUCTION, permissions: ['SECRETS_READ'] }] }));
    expect(res.status).toBe(404);
  });

  it('is invisible to other users', async () => {
    const key = await generate();
    const own = await createProject(t.http, bob, 'Mine');
    await call(bob, 'get').expect(404);
    await call(bob, 'post', '', body()).expect(404);
    await call(bob, 'delete', `/${key.id}`).expect(404);
    await call(bob, 'post', `/${key.id}/rotate`).expect(404);
    await call(bob, 'delete', `/${key.id}`, undefined, own.id).expect(404);
    await asKey(key.plaintext, project.secretsPath()).expect(200);
  });

  it('cannot manage anything', async () => {
    const { plaintext, id } = await generate();
    for (const path of ['/api/v1/projects', `/api/v1/projects/${project.id}`, `/api/v1/projects/${project.id}/api-keys`, `/api/v1/projects/${project.id}/environments`, '/api/v1/audit-logs', '/api/v1/auth/me']) {
      expect([path, (await asKey(plaintext, path)).status]).toEqual([path, 403]);
    }
    await request(t.http).post(`/api/v1/projects/${project.id}/api-keys/${id}/rotate`).set('X-API-Key', plaintext).expect(403);
  });

  it('audits creation and revocation', async () => {
    const key = await generate();
    await call(alice, 'delete', `/${key.id}`).expect(204);
    const { body: page } = await request(t.http).get('/api/v1/audit-logs?limit=2').set('Authorization', `Bearer ${alice}`);
    const items = page.items as { action: string; metadata: object }[];
    expect(items.map((e) => e.action)).toEqual(['API_KEY_REVOKED', 'API_KEY_CREATED']);
    expect(items[0]?.metadata).toMatchObject({ name: 'CI', apiKeyPrefix: key.prefix });
  });

  it('never logs the plaintext', async () => {
    t.app.useLogger(new ConsoleLogger({ json: true }));
    let plaintext = '';
    const output = await captureOutput(async () => {
      ({ plaintext } = await generate());
      await asKey(plaintext, project.secretsPath()).expect(200);
      await asKey(plaintext, '/api/v1/projects').expect(403);
      await asKey(`${plaintext}x`, project.secretsPath()).expect(401);
    });
    expect(output).toContain('"principalKind":"apiKey"');
    expect(output).not.toContain(plaintext);
  });
});
