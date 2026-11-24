import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AUDIT_REPOSITORY } from '../src/modules/audit-management/domain/repositories/audit.repository.js';
import { createTestApp, type TestApp } from './support/app.js';
import { resetDatabase } from './support/database.js';
import { createProject, type TestProject } from './support/projects.js';
import { signUp } from './support/users.js';

const CANARY = 'CANARY-9f3c';

interface Entry {
  id: string;
  action: string;
  actor: object;
  resourceId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  environmentId: string | null;
}

describe('audit log', () => {
  let t: TestApp;
  let alice: { token: string; userId: string };
  let bob: { token: string; userId: string };
  let project: TestProject;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(t.prisma);
    alice = await signUp(t.http, 'alice@example.test');
    bob = await signUp(t.http, 'bob@example.test');
    project = await createProject(t.http, alice.token);
  });
  afterAll(() => t.close());

  const call = (token: string, method: 'get' | 'post' | 'patch' | 'delete', path: string, body?: object, http = t.http) =>
    request(http)[method](path).set('Authorization', `Bearer ${token}`).send(body);
  const audit = async (token: string, query = '') =>
    (await call(token, 'get', `/api/v1/audit-logs${query}`).expect(200)).body as { items: Entry[]; nextCursor: string | null };

  it('records each operation once, with its actor and address', async () => {
    const path = project.secretsPath();
    const { id } = (await call(alice.token, 'post', path, { key: 'DB_URL', value: CANARY }).expect(201)).body as { id: string };
    await call(alice.token, 'get', `${path}/${id}`).expect(200);
    await call(alice.token, 'patch', `${path}/${id}`, { value: CANARY }).expect(200);
    await call(alice.token, 'get', `${path}/values`).expect(200);
    await call(alice.token, 'delete', `${path}/${id}`).expect(204);

    const { items } = await audit(alice.token, '?limit=100');
    expect(items.map((e) => e.action).sort()).toEqual(
      ['PROJECT_CREATED', ...Array<string>(3).fill('ENVIRONMENT_CREATED'), 'SECRET_CREATED', 'SECRET_ACCESSED', 'SECRET_UPDATED', 'SECRET_ACCESSED', 'SECRET_DELETED'].sort(),
    );
    const created = items.find((e) => e.action === 'SECRET_CREATED');
    expect(created).toMatchObject({
      actor: { type: 'user', id: alice.userId },
      resourceId: id,
      environmentId: project.environments.PRODUCTION,
      metadata: { key: 'DB_URL' },
    });
    expect(created?.ipAddress).toMatch(/127\.0\.0\.1/);
    const [raw] = await t.prisma.$queryRaw<{ text: string }[]>`SELECT string_agg(a::text, '') AS text FROM audit_logs a`;
    expect(raw?.text).not.toContain(CANARY);
  });

  it('records nothing for refused reads and unchanged metadata listings', async () => {
    const before = (await audit(alice.token, '?limit=100')).items.length;
    await call(bob.token, 'get', project.secretsPath()).expect(404);
    await call(alice.token, 'get', `${project.secretsPath()}/${randomUUID()}`).expect(404);
    await call(alice.token, 'get', project.secretsPath()).expect(200);
    expect((await audit(alice.token, '?limit=100')).items).toHaveLength(before);
  });

  it('neither stores nor reveals a secret that cannot be audited', async () => {
    const path = project.secretsPath();
    const { id } = (await call(alice.token, 'post', path, { key: 'A', value: CANARY }).expect(201)).body as { id: string };
    const broken = await createTestApp((b) =>
      b.overrideProvider(AUDIT_REPOSITORY).useValue({ append: () => Promise.reject(new Error('disk full')), list: () => Promise.resolve([]) }),
    );
    try {
      await call(alice.token, 'post', path, { key: 'B', value: CANARY }, broken.http).expect(500);
      expect(await t.prisma.secret.count()).toBe(1);
      for (const read of [`${path}/${id}`, `${path}/values`]) {
        const res = await call(alice.token, 'get', read, undefined, broken.http);
        expect(res.status).toBe(500);
        expect(res.text).not.toContain(CANARY);
      }
      await call(alice.token, 'delete', `${path}/${id}`, undefined, broken.http).expect(500);
      expect(await t.prisma.secret.count()).toBe(1);
    } finally {
      await broken.close();
    }
  });

  it('filters by action and by project', async () => {
    const other = await createProject(t.http, alice.token, 'Other');
    const byAction = await audit(alice.token, '?action=PROJECT_CREATED');
    expect(byAction.items.map((e) => e.resourceId).sort()).toEqual([project.id, other.id].sort());
    const byProject = await audit(alice.token, `?projectId=${other.id}&limit=100`);
    expect(byProject.items).toHaveLength(4);
    await call(alice.token, 'get', '/api/v1/audit-logs?action=NOPE').expect(400);
    await call(alice.token, 'get', '/api/v1/audit-logs?limit=101').expect(400);
  });

  it('pages through entries with equal timestamps without gaps or repeats', async () => {
    const createdAt = new Date('2030-01-01T00:00:00.000Z');
    await t.prisma.auditLog.createMany({
      data: Array.from({ length: 30 }, () => ({
        id: randomUUID(), userId: alice.userId, projectId: project.id, action: 'SECRET_ACCESSED', resourceType: 'SECRET', resourceId: randomUUID(), metadata: {}, createdAt,
      })),
    });
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page: Awaited<ReturnType<typeof audit>> = await audit(alice.token, `?action=SECRET_ACCESSED&limit=7${cursor ? `&cursor=${cursor}` : ''}`);
      seen.push(...page.items.map((e) => e.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(30);
    expect(new Set(seen).size).toBe(30);
    for (const bad of ['nonsense', 'e30', Buffer.from('["2030-01-01T00:00:00.000Z","x"]').toString('base64url')]) {
      await call(alice.token, 'get', `/api/v1/audit-logs?cursor=${bad}`).expect(400);
    }
  });

  it('isolates users', async () => {
    expect((await audit(bob.token)).items).toEqual([]);
    expect((await audit(bob.token, `?projectId=${project.id}`)).items).toEqual([]);
  });

  it('outlives the project', async () => {
    await call(alice.token, 'delete', `/api/v1/projects/${project.id}`).expect(204);
    const { items } = await audit(alice.token, `?projectId=${project.id}`);
    expect(items[0]?.action).toBe('PROJECT_DELETED');
    expect(items.length).toBe(5);
  });
});
