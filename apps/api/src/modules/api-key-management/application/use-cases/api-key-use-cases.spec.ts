import type { RequestContext } from '../../../../shared/domain/principal.js';
import { ApiKey } from '../../domain/entities/api-key.entity.js';
import { AuthenticateApiKeyUseCase } from './authenticate-api-key/authenticate-api-key.use-case.js';
import { GenerateApiKeyUseCase } from './generate-api-key/generate-api-key.use-case.js';
import { RevokeApiKeyUseCase } from './revoke-api-key/revoke-api-key.use-case.js';
import { RotateApiKeyUseCase } from './rotate-api-key/rotate-api-key.use-case.js';

const now = new Date('2030-01-01T00:00:00Z');
const later = new Date('2031-01-01T00:00:00Z');
const alice: RequestContext = { principal: { kind: 'user', userId: 'alice' }, ipAddress: null };
const machine: RequestContext = { principal: { kind: 'apiKey', apiKeyId: 'k1', projectId: 'p1', grants: [] }, ipAddress: null };

function setup(options: { expiresAt?: Date | null; revoked?: boolean; touchFails?: boolean; lastUsedAt?: Date } = {}) {
  const log: string[] = [];
  const added: ApiKey[] = [];
  let depth = 0;
  const existing = ApiKey.restore({
    id: 'k1', projectId: 'p1', name: 'CI', hash: 'hash-1', prefix: 'mv_aaaaaaaa',
    grants: [{ environmentId: 'e1', permissions: ['SECRETS_READ'] }],
    expiresAt: options.expiresAt === undefined ? later : options.expiresAt,
    lastUsedAt: options.lastUsedAt ?? null,
    revokedAt: options.revoked ? now : null,
    createdAt: now,
  });
  const repository = {
    add: async (key: ApiKey) => {
      added.push(key);
      log.push(`add@${depth}`);
    },
    revoke: async () => log.push(`revoke@${depth}`) > 0,
    findById: async (projectId: string, id: string) => (projectId === 'p1' && id === 'k1' ? existing : null),
    findByHash: async (hash: string) => (hash === 'hash-1' ? existing : null),
    listByProject: async () => [existing],
    touchLastUsed: async () => {
      log.push('touch');
      if (options.touchFails) throw new Error('db busy');
    },
  };
  const generator = { generate: () => ({ plaintext: 'mv_new', hash: 'hash-2', prefix: 'mv_bbbbbbbb' }), hash: (raw: string) => (raw === 'mv_good' ? 'hash-1' : raw === 'bad' ? null : 'other') };
  const unitOfWork = {
    run: async <T>(work: () => Promise<T>): Promise<T> => {
      depth += 1;
      try {
        return await work();
      } finally {
        depth -= 1;
      }
    },
  };
  const events = { publish: async (list: readonly { name: string }[]) => void log.push(...list.map((e) => `${e.name}@${depth}`)) };
  const access = { assert: async () => {} };
  const environments = { exists: async (_p: string, id: string) => id === 'e1' };
  const clock = { now: () => now };
  const ids = { next: () => 'k2' };
  return {
    log, added,
    generate: new GenerateApiKeyUseCase(repository, generator, access, environments, unitOfWork, events, ids, clock),
    rotate: new RotateApiKeyUseCase(repository, generator, access, unitOfWork, events, ids, clock),
    revoke: new RevokeApiKeyUseCase(repository, access, unitOfWork, events, clock),
    authenticate: new AuthenticateApiKeyUseCase(repository, generator, clock),
  };
}

describe('generate', () => {
  const command = { context: alice, projectId: 'p1', name: 'CI', expiresAt: null };
  it('returns the plaintext once and stores the hash', async () => {
    const s = setup();
    const result = await s.generate.execute({ ...command, grants: [{ environmentId: 'e1', permissions: ['SECRETS_READ'] }] });
    expect(result.plaintext).toBe('mv_new');
    expect(s.added[0]?.hash).toBe('hash-2');
    expect(s.log).toEqual(['add@1', 'ApiKeyCreated@1']);
  });
  it("refuses another project's environment", async () => {
    await expect(setup().generate.execute({ ...command, grants: [{ environmentId: 'e9', permissions: ['SECRETS_READ'] }] })).rejects.toMatchObject({ code: 'ENVIRONMENT_NOT_FOUND' });
  });
  it('is not available to API keys', async () => {
    const s = setup();
    const grants = [{ environmentId: 'e1', permissions: ['SECRETS_READ' as const] }];
    await expect(s.generate.execute({ ...command, context: machine, grants })).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(s.rotate.execute({ context: machine, projectId: 'p1', apiKeyId: 'k1' })).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(s.revoke.execute({ context: machine, projectId: 'p1', apiKeyId: 'k1' })).rejects.toMatchObject({ kind: 'forbidden' });
  });
});

describe('rotate', () => {
  it('replaces the key in one transaction, keeping its scope', async () => {
    const s = setup();
    const result = await s.rotate.execute({ context: alice, projectId: 'p1', apiKeyId: 'k1' });
    expect(result).toMatchObject({ id: 'k2', name: 'CI', plaintext: 'mv_new', expiresAt: later, grants: [{ environmentId: 'e1', permissions: ['SECRETS_READ'] }] });
    expect(s.log).toEqual(['revoke@1', 'add@1', 'ApiKeyRevoked@1', 'ApiKeyCreated@1']);
  });
  it.each([
    ['revoked', { revoked: true }],
    ['expired', { expiresAt: now }],
  ])('refuses a key that is %s', async (_name, options) => {
    const s = setup(options);
    await expect(s.rotate.execute({ context: alice, projectId: 'p1', apiKeyId: 'k1' })).rejects.toMatchObject({ code: 'API_KEY_NOT_ACTIVE' });
    expect(s.log).toEqual([]);
  });
});

describe('authenticate', () => {
  it('resolves a usable key to its principal', async () => {
    expect(await setup().authenticate.authenticate('mv_good')).toEqual({
      kind: 'apiKey', apiKeyId: 'k1', projectId: 'p1', grants: [{ environmentId: 'e1', permissions: ['SECRETS_READ'] }],
    });
  });
  it.each([
    ['unknown', 'mv_unknown', {}],
    ['malformed', 'bad', {}],
    ['revoked', 'mv_good', { revoked: true }],
    ['expired', 'mv_good', { expiresAt: now }],
  ])('rejects a key that is %s', async (_name, raw, options) => {
    const s = setup(options);
    expect(await s.authenticate.authenticate(raw)).toBeNull();
    expect(s.log).toEqual([]);
  });
  it('still works when the usage time cannot be written', async () => {
    expect(await setup({ touchFails: true }).authenticate.authenticate('mv_good')).not.toBeNull();
  });
  it('writes the usage time at most once a minute', async () => {
    const recent = setup({ lastUsedAt: new Date(now.getTime() - 59_000) });
    await recent.authenticate.authenticate('mv_good');
    expect(recent.log).toEqual([]);
    const old = setup({ lastUsedAt: new Date(now.getTime() - 60_000) });
    await old.authenticate.authenticate('mv_good');
    expect(old.log).toEqual(['touch']);
  });
});
