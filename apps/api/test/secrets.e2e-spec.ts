import { ConsoleLogger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { ENCRYPTION } from '../src/modules/secrets-management/application/ports/output/encryption.port.js';
import { GoCryptoAdapter } from '../src/modules/secrets-management/infrastructure/adapters/output/cryptography/go-crypto.adapter.js';
import { createTestApp, type TestApp } from './support/app.js';
import { resetDatabase } from './support/database.js';
import { captureOutput } from './support/logs.js';
import { createProject, type TestProject } from './support/projects.js';
import { signUp } from './support/users.js';

const CANARY = 'CANARY-9f3c';

describe('secrets', () => {
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

  type Method = 'get' | 'post' | 'patch' | 'delete';
  const call = (token: string, method: Method, path: string, body?: object, http = t.http) =>
    request(http)[method](path).set('Authorization', `Bearer ${token}`).send(body);
  const store = async (key: string, value: string) =>
    (await call(alice, 'post', project.secretsPath(), { key, value }).expect(201)).body.id as string;

  it('stores, lists, reveals, updates and deletes', async () => {
    const created = await call(alice, 'post', project.secretsPath(), { key: 'DB_URL', value: 'first' });
    expect(created.status).toBe(201);
    expect(Object.keys(created.body).sort()).toEqual(['createdAt', 'encryptionKeyVersion', 'id', 'key', 'updatedAt']);
    const path = `${project.secretsPath()}/${created.body.id as string}`;

    const list = await call(alice, 'get', project.secretsPath());
    expect(list.body).toEqual([created.body]);

    const revealed = await call(alice, 'get', path);
    expect(revealed.body).toEqual({ ...created.body, value: 'first' });
    expect(revealed.headers['cache-control']).toBe('no-store');

    const updated = await call(alice, 'patch', path, { value: 'second' });
    expect(updated.status).toBe(200);
    expect(updated.body.value).toBeUndefined();
    expect((await call(alice, 'get', path)).body.value).toBe('second');

    await call(alice, 'delete', path).expect(204);
    await call(alice, 'get', path).expect(404);
    await call(alice, 'patch', path, { value: 'x' }).expect(404);
    await call(alice, 'delete', path).expect(404);
  });

  it.each(['', 'trailing newline\n', '  padded  ', '🔐 é', 'x'.repeat(32768), 'nul\u0000byte', '﻿bom'])(
    'returns value case %# byte for byte',
    async (value) => {
      const id = await store('KEY', value);
      const { body } = await call(alice, 'get', `${project.secretsPath()}/${id}`).expect(200);
      expect(Buffer.from(body.value as string).equals(Buffer.from(value))).toBe(true);
    },
  );

  it.each([
    ['unpaired surrogate', { key: 'KEY', value: '\ud800' }],
    ['too many bytes', { key: 'KEY', value: 'é'.repeat(16385) }],
    ['lowercase key', { key: 'key', value: 'v' }],
    ['missing value', { key: 'KEY' }],
    ['null value', { key: 'KEY', value: null }],
    ['unknown field', { key: 'KEY', value: 'v', environmentId: randomUUID() }],
  ])('rejects %s', async (_name, body) => {
    await call(alice, 'post', project.secretsPath(), body).expect(400);
    expect(await t.prisma.secret.count()).toBe(0);
  });

  it('does not allow renaming through an update', async () => {
    const id = await store('KEY', 'v');
    await call(alice, 'patch', `${project.secretsPath()}/${id}`, { key: 'OTHER', value: 'v' }).expect(400);
  });

  it('reads several values at once', async () => {
    await store('B', '2');
    await store('A', '1');
    const all = await call(alice, 'get', `${project.secretsPath()}/values`);
    expect(all.headers['cache-control']).toBe('no-store');
    expect((all.body as { key: string; value: string }[]).map((s) => [s.key, s.value])).toEqual([['A', '1'], ['B', '2']]);
    const one = await call(alice, 'get', `${project.secretsPath()}/values?keys=B`);
    expect(one.body).toHaveLength(1);
    const missing = await call(alice, 'get', `${project.secretsPath()}/values?keys=A,NOPE`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.message).toContain('NOPE');
  });

  it('stores only ciphertext, different for equal values', async () => {
    await store('A', CANARY);
    await store('B', CANARY);
    const [a, b] = await t.prisma.secret.findMany();
    const bytes = Buffer.concat([a, b].flatMap((row) => [Buffer.from(row?.encryptedValue ?? []), Buffer.from(row?.nonce ?? [])]));
    expect(bytes.includes(CANARY)).toBe(false);
    expect(Buffer.from(a?.encryptedValue ?? []).equals(Buffer.from(b?.encryptedValue ?? []))).toBe(false);
    expect(Buffer.from(a?.nonce ?? []).equals(Buffer.from(b?.nonce ?? []))).toBe(false);
  });

  it('detects ciphertext copied from another secret', async () => {
    const [a, b] = [await store('A', 'one'), await store('B', 'two')];
    const source = await t.prisma.secret.findUniqueOrThrow({ where: { id: a } });
    await t.prisma.secret.update({ where: { id: b }, data: { encryptedValue: source.encryptedValue, nonce: source.nonce } });
    const res = await call(alice, 'get', `${project.secretsPath()}/${b}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toEqual({ code: 'SECRET_INTEGRITY_FAILURE', message: 'The secret could not be read.', correlationId: expect.any(String) });
  });

  it('keeps keys unique per environment, even under concurrency', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => call(alice, 'post', project.secretsPath(), { key: 'RACE', value: 'v' })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, ...Array<number>(19).fill(409)]);
    await call(alice, 'post', project.secretsPath('STAGING'), { key: 'RACE', value: 'v' }).expect(201);
  });

  it('does not resolve a secret through another environment', async () => {
    const id = await store('KEY', 'v');
    await call(alice, 'get', `${project.secretsPath('STAGING')}/${id}`).expect(404);
    await call(alice, 'delete', `${project.secretsPath('STAGING')}/${id}`).expect(404);
  });

  it("hides everything from other users, including behind the attacker's own project", async () => {
    const id = await store('KEY', CANARY);
    const own = await createProject(t.http, bob, 'Mine');
    const victim = project.secretsPath();
    const attempts: [Method, string, object?][] = [
      ['get', victim],
      ['get', `${victim}/values`],
      ['post', victim, { key: 'X', value: 'x' }],
      ['get', `${victim}/${id}`],
      ['patch', `${victim}/${id}`, { value: 'x' }],
      ['delete', `${victim}/${id}`],
      ['get', `/api/v1/projects/${own.id}/environments/${project.environments.PRODUCTION}/secrets`],
      ['get', `${own.secretsPath()}/${id}`],
      ['delete', `${own.secretsPath()}/${id}`],
    ];
    for (const [method, path, body] of attempts) {
      const res = await call(bob, method, path, body);
      expect([method, path, res.status]).toEqual([method, path, 404]);
      expect(res.text).not.toContain(CANARY);
    }
    expect((await call(alice, 'get', `${victim}/${id}`)).body.value).toBe(CANARY);
  });

  describe('without the engine', () => {
    it.each([
      ['stopped', 'http://127.0.0.1:1'],
      ['unroutable', 'http://10.255.255.1:8081'],
    ])('fails fast, writes nothing and keeps listing when %s', async (_name, baseUrl) => {
      const id = await store('KEY', 'v');
      const broken = await createTestApp((b) =>
        b.overrideProvider(ENCRYPTION).useValue(new GoCryptoAdapter({ baseUrl, token: 'x', timeoutMs: 3000 })),
      );
      try {
        const startedAt = performance.now();
        const [created, revealed] = await Promise.all([
          call(alice, 'post', project.secretsPath(), { key: 'NEW', value: 'v' }, broken.http),
          call(alice, 'get', `${project.secretsPath()}/${id}`, undefined, broken.http),
        ]);
        expect(performance.now() - startedAt).toBeLessThan(3500);
        expect([created.status, revealed.status]).toEqual([503, 503]);
        expect(created.body.error.code).toBe('ENCRYPTION_UNAVAILABLE');
        expect(await t.prisma.secret.count()).toBe(1);
        expect((await call(alice, 'get', project.secretsPath(), undefined, broken.http)).body).toHaveLength(1);
      } finally {
        await broken.close();
      }
    });
  });

  it('never writes a value to the logs', async () => {
    const broken = await createTestApp((b) =>
      b.overrideProvider(ENCRYPTION).useValue(new GoCryptoAdapter({ baseUrl: 'http://127.0.0.1:1', token: 'x', timeoutMs: 500 })),
    );
    for (const app of [t.app, broken.app]) app.useLogger(new ConsoleLogger({ json: true }));
    const output = await captureOutput(async () => {
      const body = { key: 'LOGGED', value: CANARY };
      const { body: created } = await call(alice, 'post', project.secretsPath(), body).expect(201);
      await call(alice, 'post', project.secretsPath(), body).expect(409);
      await call(alice, 'post', project.secretsPath(), { ...body, extra: CANARY }).expect(400);
      await call(alice, 'post', project.secretsPath(), { key: CANARY, value: CANARY }).expect(400);
      await call(alice, 'post', project.secretsPath(), body, broken.http).expect(503);
      await call(alice, 'get', `${project.secretsPath()}/${created.id as string}`).expect(200);
      await call(alice, 'get', `${project.secretsPath()}/values?keys=LOGGED`).expect(200);
    });
    await broken.close();
    expect(output).toContain('"route"');
    expect(output).not.toContain(CANARY);
    expect(output).not.toContain(Buffer.from(CANARY).toString('base64'));
  });
});
