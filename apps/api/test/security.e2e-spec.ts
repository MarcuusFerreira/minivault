import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { createTestApp, type TestApp } from './support/app.js';
import { resetDatabase } from './support/database.js';
import { createProject } from './support/projects.js';
import { signUp } from './support/users.js';

const PAYLOADS = [`'; DROP TABLE secrets; --`, `" OR 1=1 --`, `\${7*7}`, `{"$ne":null}`, `../../etc/passwd`, `%00`, `<script>alert(1)</script>`];

describe('security', () => {
  let t: TestApp;
  let token: string;
  beforeAll(async () => {
    t = await createTestApp();
    await resetDatabase(t.prisma);
    token = (await signUp(t.http, 'alice@example.test')).token;
  });
  afterAll(() => t.close());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it.each(PAYLOADS)('treats %s as text', async (payload) => {
    const project = await createProject(t.http, token, `P ${payload}`);
    const read = await request(t.http).get(`/api/v1/projects/${project.id}`).set(auth()).expect(200);
    expect(read.body.name).toBe(`P ${payload}`);
    const stored = await request(t.http).post(project.secretsPath()).set(auth()).send({ key: 'K', value: payload }).expect(201);
    const revealed = await request(t.http).get(`${project.secretsPath()}/${stored.body.id as string}`).set(auth()).expect(200);
    expect(revealed.body.value).toBe(payload);
    const encoded = encodeURIComponent(payload);
    for (const path of [
      `/api/v1/projects/${encoded}`,
      `/api/v1/audit-logs?projectId=${encoded}`,
      `/api/v1/audit-logs?cursor=${encoded}`,
      `/api/v1/audit-logs?action=${encoded}`,
      `${project.secretsPath()}/${encoded}`,
      `${project.secretsPath()}/values?keys=${encoded}`,
    ]) {
      const res = await request(t.http).get(path).set(auth());
      expect([path, res.status >= 400 && res.status < 500]).toEqual([path, true]);
    }
  });

  it('survives a NUL byte where PostgreSQL cannot store one', async () => {
    const created = await request(t.http).post('/api/v1/projects').set(auth()).send({ name: 'a\u0000b' });
    expect(created.status).toBe(400);
    const registered = await request(t.http).post('/api/v1/auth/register').send({ name: 'a\u0000b', email: 'nul@example.test', password: 'correct horse battery' });
    expect(registered.status).toBe(400);
    const project = await createProject(t.http, token, 'NUL');
    const key = await request(t.http).post(`/api/v1/projects/${project.id}/api-keys`).set(auth())
      .send({ name: 'a\u0000b', expiresAt: null, grants: [{ environmentId: project.environments.PRODUCTION, permissions: ['SECRETS_READ'] }] });
    expect(key.status).toBe(400);
  });

  it.each(['\u0000', '\ud800'])('rejects unstorable text in logins, emails and bulk reads (%j)', async (bad) => {
    const login = await request(t.http).post('/api/v1/auth/login').send({ email: `a${bad}@b.co`, password: 'correct horse battery' });
    expect(login.status).toBe(401);
    const project = await createProject(t.http, token, `Unstorable ${bad.charCodeAt(0)}`);
    const bulk = await request(t.http).get(`${project.secretsPath()}/values?keys=A%00`).set(auth());
    expect(bulk.status).toBe(400);
    const renamed = await request(t.http).patch(`/api/v1/projects/${project.id}`).set(auth()).send({ description: `x${bad}` });
    expect(renamed.status).toBe(400);
  });

  it('does not pollute prototypes', async () => {
    const res = await request(t.http).post('/api/v1/projects').set(auth()).set('Content-Type', 'application/json').send('{"name":"x","__proto__":{"ownerId":"y"}}');
    expect([201, 400]).toContain(res.status);
    expect(({} as Record<string, unknown>).ownerId).toBeUndefined();
  });

  it('answers preflight only for the web origin', async () => {
    const preflight = (origin: string) =>
      request(t.http).options('/api/v1/projects').set('Origin', origin).set('Access-Control-Request-Method', 'POST');
    expect((await preflight('https://evil.test')).headers['access-control-allow-origin']).not.toBe('https://evil.test');
    expect((await preflight('http://localhost:8080')).headers['access-control-allow-origin']).toBe('http://localhost:8080');
  });

  it('trusts exactly one proxy hop for the recorded address', async () => {
    const created = await request(t.http).post('/api/v1/projects').set(auth()).set('X-Forwarded-For', '6.6.6.6, 198.51.100.7').send({ name: 'Addr' }).expect(201);
    const entry = await t.prisma.auditLog.findFirstOrThrow({ where: { action: 'PROJECT_CREATED', resourceId: created.body.id as string } });
    expect(entry.ipAddress).toBe('198.51.100.7');
  });

  it('keeps credentials out of the repository', () => {
    const root = join(import.meta.dirname, '../../..');
    const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter((f) => f && !/package-lock\.json|go\.sum|\.png$/.test(f));
    expect(files).not.toContain('.env');
    const suspicious = files.filter((file) => {
      const text = readFileSync(join(root, file), 'utf8');
      return /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text) || /\bmv_[A-Za-z0-9_-]{43}\b/.test(text) || /(?<![A-Za-z0-9+/=])[A-Za-z0-9+/]{43}=(?![A-Za-z0-9+/=])/.test(text);
    });
    expect(suspicious).toEqual([]);
  });
});
