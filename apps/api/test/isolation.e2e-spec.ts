import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createOpenApiDocument } from '../src/openapi.js';
import { createTestApp, type TestApp } from './support/app.js';
import { resetDatabase } from './support/database.js';
import { createProject, type TestProject } from './support/projects.js';
import { signUp } from './support/users.js';

const METHODS = ['get', 'post', 'patch', 'put', 'delete'] as const;
const PUBLIC = ['get /health', 'get /ready', 'post /api/v1/auth/register', 'post /api/v1/auth/login', 'post /api/v1/auth/session', 'delete /api/v1/auth/session'];
/** Routes that act on the caller alone, so there is no one else's resource to reach. */
const SELF_SCOPED = ['get /api/v1/auth/me', 'get /api/v1/projects', 'post /api/v1/projects', 'get /api/v1/audit-logs', 'get /api/v1/machine/secrets'];

/** Every route is discovered, so a new one cannot be forgotten. */
describe('isolation of every route', () => {
  let t: TestApp;
  let bob: string;
  let project: TestProject;
  let routes: { id: string; method: (typeof METHODS)[number]; path: string }[];
  let resources: Record<string, string>;
  beforeAll(async () => {
    t = await createTestApp();
    await resetDatabase(t.prisma);
    const alice = (await signUp(t.http, 'alice@example.test')).token;
    bob = (await signUp(t.http, 'bob@example.test')).token;
    project = await createProject(t.http, alice);
    const auth = { Authorization: `Bearer ${alice}` };
    const secret = await request(t.http).post(project.secretsPath()).set(auth).send({ key: 'K', value: 'v' }).expect(201);
    const key = await request(t.http)
      .post(`/api/v1/projects/${project.id}/api-keys`)
      .set(auth)
      .send({ name: 'CI', expiresAt: null, grants: [{ environmentId: project.environments.PRODUCTION, permissions: ['SECRETS_READ'] }] })
      .expect(201);
    resources = {
      projectId: project.id,
      environmentId: project.environments.PRODUCTION,
      secretId: secret.body.id as string,
      apiKeyId: key.body.id as string,
    };
    routes = Object.entries(createOpenApiDocument(t.app).paths).flatMap(([path, item]) =>
      METHODS.filter((method) => item?.[method]).map((method) => ({ id: `${method} ${path}`, method, path })),
    );
  });
  afterAll(() => t.close());

  const url = (path: string, values: Record<string, string>) =>
    path.replace(/\{(\w+)\}/g, (_, name: string) => {
      const value = values[name];
      if (value === undefined) throw new Error(`No test resource for {${name}}: add one`);
      return value;
    });
  const body = (id: string): object => {
    if (id.endsWith('/environments')) return { name: 'STAGING' };
    if (id.endsWith('/secrets')) return { key: 'X', value: 'x' };
    if (id.endsWith('{secretId}')) return { value: 'x' };
    if (id.endsWith('/api-keys')) return { name: 'x', expiresAt: null, grants: [{ environmentId: project.environments.PRODUCTION, permissions: ['SECRETS_READ'] }] };
    return { name: 'x' };
  };

  it('discovers the routes', () => {
    expect(routes.length).toBeGreaterThan(20);
    expect(routes.map((r) => r.id)).toEqual(expect.arrayContaining([...PUBLIC, ...SELF_SCOPED]));
  });

  it('answers anonymous callers with 401 everywhere but on the public routes', async () => {
    for (const { id, method, path } of routes.filter((r) => !PUBLIC.includes(r.id))) {
      const res = await request(t.http)[method](url(path, resources)).send(method === 'get' ? undefined : body(id));
      expect([id, res.status]).toEqual([id, 401]);
    }
  });

  it("answers another user with 404 on every resource that is not theirs, as for one that doesn't exist", async () => {
    const before = await t.prisma.secret.count();
    const scoped = routes.filter((r) => !PUBLIC.includes(r.id) && !SELF_SCOPED.includes(r.id));
    expect(scoped.length).toBeGreaterThan(14);
    const missing = Object.fromEntries(Object.keys(resources).map((name) => [name, randomUUID()]));
    for (const { id, method, path } of scoped) {
      for (const values of [resources, missing]) {
        const res = await request(t.http)[method](url(path, values)).set('Authorization', `Bearer ${bob}`).send(method === 'get' ? undefined : body(id));
        expect([id, res.status]).toEqual([id, 404]);
      }
    }
    expect(await t.prisma.secret.count()).toBe(before);
    expect(await t.prisma.environment.count()).toBe(3);
    expect(await t.prisma.apiKey.count({ where: { revokedAt: null } })).toBe(1);
  });

  it('documents both ways to authenticate', () => {
    const document = createOpenApiDocument(t.app);
    expect(Object.keys(document.components?.securitySchemes ?? {}).sort()).toEqual(['apiKey', 'bearer']);
    const reveal = document.paths['/api/v1/projects/{projectId}/environments/{environmentId}/secrets/{secretId}']?.get;
    expect(reveal?.security).toEqual(expect.arrayContaining([{ bearer: [] }, { apiKey: [] }]));
    expect(document.paths['/api/v1/projects']?.get?.security).toEqual([{ bearer: [] }]);
    expect(JSON.stringify(document.paths['/api/v1/auth/register']?.post?.requestBody)).toContain('password');
  });

  it('serves the documentation', async () => {
    await request(t.http).get('/api/docs').expect(200);
    await request(t.http).get('/api/docs-json').expect(200);
  });
});
