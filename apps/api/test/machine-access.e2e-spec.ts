import request from 'supertest';
import { createTestApp, type TestApp } from './support/app.js';
import { resetDatabase } from './support/database.js';
import { createProject, type TestProject } from './support/projects.js';
import { signUp } from './support/users.js';

describe('machine access', () => {
  let t: TestApp;
  let alice: string;
  let bob: string;
  let project: TestProject;
  let secretId: string;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(t.prisma);
    alice = (await signUp(t.http, 'alice@example.test')).token;
    bob = (await signUp(t.http, 'bob@example.test')).token;
    project = await createProject(t.http, alice);
    const stored = await asUser(alice).post(project.secretsPath(), { key: 'DB_URL', value: 'postgres://x' }).expect(201);
    secretId = stored.body.id as string;
  });
  afterAll(() => t.close());

  type Headers = Record<string, string>;
  const client = (headers: Headers) => ({
    get: (path: string) => request(t.http).get(path).set(headers),
    post: (path: string, body: object) => request(t.http).post(path).set(headers).send(body),
    patch: (path: string, body: object) => request(t.http).patch(path).set(headers).send(body),
    delete: (path: string) => request(t.http).delete(path).set(headers),
  });
  const asUser = (token: string) => client({ Authorization: `Bearer ${token}` });
  type EnvName = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
  async function issue(grants: Partial<Record<EnvName, string[]>>, owner = alice, where = project) {
    const body = {
      name: 'CI',
      expiresAt: null,
      grants: Object.entries(grants).map(([name, permissions]) => ({ environmentId: where.environments[name as EnvName], permissions })),
    };
    const res = await asUser(owner).post(`/api/v1/projects/${where.id}/api-keys`, body).expect(201);
    return { key: res.body.plaintext as string, id: res.body.id as string };
  }
  const MACHINE = '/api/v1/machine/secrets?environment=PRODUCTION';

  it('returns an environment ready to load', async () => {
    const { key } = await issue({ PRODUCTION: ['SECRETS_READ'] });
    const res = await client({ 'X-API-Key': key }).get(MACHINE);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ environment: 'PRODUCTION', secrets: { DB_URL: 'postgres://x' } });
    expect(res.headers['cache-control']).toBe('no-store');
    await client({ 'X-API-Key': key }).get('/api/v1/machine/secrets?environment=QA').expect(400);
    await client({ 'X-API-Key': key }).get('/api/v1/machine/secrets?environment=STAGING').expect(403);
  });

  it('lets keys be named __proto__ without surprises', async () => {
    await asUser(alice).post(project.secretsPath(), { key: '__PROTO__', value: 'v' }).expect(201);
    const { key } = await issue({ PRODUCTION: ['SECRETS_READ'] });
    expect((await client({ 'X-API-Key': key }).get(MACHINE)).body.secrets.__PROTO__).toBe('v');
  });

  it('audits the key as the actor', async () => {
    const { key, id } = await issue({ PRODUCTION: ['SECRETS_READ'] });
    await client({ 'X-API-Key': key }).get(MACHINE).expect(200);
    const entry = await t.prisma.auditLog.findFirstOrThrow({ where: { action: 'SECRET_ACCESSED' } });
    expect(entry).toMatchObject({ userId: null, metadata: { key: 'DB_URL', apiKeyId: id } });
    const { body } = await asUser(alice).get('/api/v1/audit-logs?action=SECRET_ACCESSED').expect(200);
    expect(body.items[0]).toMatchObject({ actor: { type: 'apiKey', id }, metadata: { key: 'DB_URL' } });
  });

  // Expected status per credential for: list, reveal, bulk, machine, create, update, delete.
  const matrix: [string, number[]][] = [
    ['nothing', [401, 401, 401, 401, 401, 401, 401]],
    ['garbage key', [401, 401, 401, 401, 401, 401, 401]],
    ['revoked key', [401, 401, 401, 401, 401, 401, 401]],
    ['expired key', [401, 401, 401, 401, 401, 401, 401]],
    ['key of another project', [404, 404, 404, 200, 404, 404, 404]],
    ['key for another environment', [403, 403, 403, 403, 403, 403, 403]],
    ['read key', [200, 200, 200, 200, 403, 403, 403]],
    ['write key', [403, 403, 403, 403, 201, 200, 204]],
    ['read and write key', [200, 200, 200, 200, 201, 200, 204]],
    ['owner', [200, 200, 200, 403, 201, 200, 204]],
    ['stranger', [404, 404, 404, 403, 404, 404, 404]],
    ['owner token with a garbage key', [401, 401, 401, 401, 401, 401, 401]],
  ];
  async function credentials(name: string): Promise<Headers> {
    switch (name) {
      case 'nothing':
        return {};
      case 'garbage key':
        return { 'X-API-Key': `mv_${'a'.repeat(43)}` };
      case 'revoked key': {
        const { key, id } = await issue({ PRODUCTION: ['SECRETS_READ'] });
        await asUser(alice).delete(`/api/v1/projects/${project.id}/api-keys/${id}`).expect(204);
        return { 'X-API-Key': key };
      }
      case 'expired key': {
        const { key, id } = await issue({ PRODUCTION: ['SECRETS_READ'] });
        await t.prisma.apiKey.update({ where: { id }, data: { expiresAt: new Date(0) } });
        return { 'X-API-Key': key };
      }
      case 'key of another project': {
        const other = await createProject(t.http, bob, 'Theirs');
        return { 'X-API-Key': (await issue({ PRODUCTION: ['SECRETS_READ', 'SECRETS_WRITE'] }, bob, other)).key };
      }
      case 'key for another environment':
        return { 'X-API-Key': (await issue({ STAGING: ['SECRETS_READ', 'SECRETS_WRITE'] })).key };
      case 'read key':
        return { 'X-API-Key': (await issue({ PRODUCTION: ['SECRETS_READ'] })).key };
      case 'write key':
        return { 'X-API-Key': (await issue({ PRODUCTION: ['SECRETS_WRITE'] })).key };
      case 'read and write key':
        return { 'X-API-Key': (await issue({ PRODUCTION: ['SECRETS_READ', 'SECRETS_WRITE'] })).key };
      case 'owner':
        return { Authorization: `Bearer ${alice}` };
      case 'stranger':
        return { Authorization: `Bearer ${bob}` };
      default:
        return { Authorization: `Bearer ${alice}`, 'X-API-Key': `mv_${'a'.repeat(43)}` };
    }
  }

  it.each(matrix)('%s', async (name, expected) => {
    const c = client(await credentials(name));
    const path = project.secretsPath();
    const responses = [
      await c.get(path),
      await c.get(`${path}/${secretId}`),
      await c.get(`${path}/values`),
      await c.get(MACHINE),
      await c.post(path, { key: 'NEW', value: 'v' }),
      await c.patch(`${path}/${secretId}`, { value: 'v' }),
      await c.delete(`${path}/${secretId}`),
    ];
    expect(responses.map((r) => r.status)).toEqual(expected);
    if (name !== 'owner' && !name.includes('read')) {
      for (const response of responses) expect(response.text).not.toContain('postgres://x');
    }
  });

  it('stops when the project disappears, and the history stays', async () => {
    const { key } = await issue({ PRODUCTION: ['SECRETS_READ'] });
    await client({ 'X-API-Key': key }).get(MACHINE).expect(200);
    await asUser(alice).delete(`/api/v1/projects/${project.id}`).expect(204);
    await client({ 'X-API-Key': key }).get(MACHINE).expect(401);
    const { body } = await asUser(alice).get(`/api/v1/audit-logs?projectId=${project.id}`).expect(200);
    expect((body.items as { action: string }[]).map((e) => e.action)).toContain('API_KEY_CREATED');
  });

  it('loses only the environment that disappears', async () => {
    const { key } = await issue({ PRODUCTION: ['SECRETS_READ'], STAGING: ['SECRETS_READ'] });
    await asUser(alice).delete(`/api/v1/projects/${project.id}/environments/${project.environments.PRODUCTION}`).expect(204);
    await client({ 'X-API-Key': key }).get(MACHINE).expect(404);
    await client({ 'X-API-Key': key }).get('/api/v1/machine/secrets?environment=STAGING').expect(200, { environment: 'STAGING', secrets: {} });
    // A recreated environment is a new one: the old grant must not come back.
    await asUser(alice).post(`/api/v1/projects/${project.id}/environments`, { name: 'PRODUCTION' }).expect(201);
    await client({ 'X-API-Key': key }).get(MACHINE).expect(403);
  });
});
