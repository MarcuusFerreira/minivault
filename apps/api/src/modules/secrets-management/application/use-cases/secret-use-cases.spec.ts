import type { Grant, RequestContext } from '../../../../shared/domain/principal.js';
import { ApplicationError } from '../../../../shared/application/application-error.js';
import { Secret } from '../../domain/entities/secret.entity.js';
import { EncryptedValue } from '../../domain/value-objects/encrypted-value.vo.js';
import { SecretKey } from '../../domain/value-objects/secret-key.vo.js';
import { SecretAccessPolicy } from '../services/secret-access.policy.js';
import { DeleteSecretUseCase } from './delete-secret/delete-secret.use-case.js';
import { ListSecretMetadataUseCase } from './list-secret-metadata/list-secret-metadata.use-case.js';
import { RetrieveSecretUseCase } from './retrieve-secret/retrieve-secret.use-case.js';
import { RetrieveSecretsUseCase } from './retrieve-secrets/retrieve-secrets.use-case.js';
import { StoreSecretUseCase } from './store-secret/store-secret.use-case.js';
import { UpdateSecretUseCase } from './update-secret/update-secret.use-case.js';

const now = new Date(0);
const alice: RequestContext = { principal: { kind: 'user', userId: 'alice' }, ipAddress: '10.0.0.1' };
const bob: RequestContext = { principal: { kind: 'user', userId: 'bob' }, ipAddress: null };
const key = (grants: Grant[], projectId = 'p1'): RequestContext => ({ principal: { kind: 'apiKey', apiKeyId: 'k', projectId, grants }, ipAddress: null });
const READ = key([{ environmentId: 'e1', permissions: ['SECRETS_READ'] }]);
const WRITE = key([{ environmentId: 'e1', permissions: ['SECRETS_WRITE'] }]);

function setup(secretCount = 2) {
  const log: string[] = [];
  const load = { current: 0, peak: 0 };
  const fail = { encrypt: false, decrypt: '', publish: false };
  let inTransaction = false;
  const secrets = Array.from({ length: secretCount }, (_, i) =>
    Secret.restore({
      id: `s${i}`,
      projectId: 'p1',
      environmentId: 'e1',
      key: SecretKey.create(`KEY_${i}`),
      encryptedValue: EncryptedValue.create({ ciphertext: new Uint8Array(16), nonce: new Uint8Array(12), keyVersion: 1 }),
      createdAt: now,
      updatedAt: now,
    }),
  );
  const repository = {
    add: async () => void log.push('add'),
    save: async () => log.push('save') > 0,
    remove: async () => log.push('remove') > 0,
    findById: async (scope: { environmentId: string }, id: string) =>
      secrets.find((s) => s.environmentId === scope.environmentId && s.id === id) ?? null,
    findByKeys: async (_scope: object, keys: readonly string[] | null, limit: number) =>
      secrets.filter((s) => !keys || keys.includes(s.key.value)).slice(0, limit),
    list: async () => secrets,
  };
  const encryption = {
    encrypt: async (context: { secretId: string }) => {
      log.push(inTransaction ? 'ENCRYPT IN TRANSACTION' : `encrypt:${context.secretId}`);
      if (fail.encrypt) throw new ApplicationError('ENCRYPTION_UNAVAILABLE', 'unavailable', 'x');
      return EncryptedValue.create({ ciphertext: new Uint8Array(16), nonce: new Uint8Array(12), keyVersion: 2 });
    },
    decrypt: async (context: { secretId: string }) => {
      log.push(inTransaction ? 'DECRYPT IN TRANSACTION' : `decrypt:${context.secretId}`);
      load.current += 1;
      load.peak = Math.max(load.peak, load.current);
      await new Promise((resolve) => setImmediate(resolve));
      load.current -= 1;
      if (fail.decrypt === context.secretId) throw new ApplicationError('SECRET_INTEGRITY_FAILURE', 'internal', 'x');
      return `value-of-${context.secretId}`;
    },
  };
  const unitOfWork = {
    run: async <T>(work: () => Promise<T>): Promise<T> => {
      inTransaction = true;
      try {
        return await work();
      } finally {
        inTransaction = false;
      }
    },
  };
  const events = {
    publish: async (list: readonly { name: string }[]) => {
      if (fail.publish) throw new Error('audit down');
      log.push(...list.map((e) => (inTransaction ? e.name : `OUTSIDE ${e.name}`)));
    },
  };
  const policy = new SecretAccessPolicy(
    {
      assert: async (principal, projectId) => {
        const ok = principal.kind === 'user' ? principal.userId === 'alice' && projectId === 'p1' : principal.projectId === projectId;
        if (!ok) throw new ApplicationError('PROJECT_NOT_FOUND', 'not_found', 'x');
      },
    },
    {
      byId: async (projectId, id) => (projectId === 'p1' && ['e1', 'e2'].includes(id) ? { id, name: 'PRODUCTION' } : null),
      byName: async () => null,
    },
  );
  const clock = { now: () => now };
  return {
    log,
    load,
    fail,
    policy,
    store: new StoreSecretUseCase(repository, encryption, policy, unitOfWork, events, { next: () => 'new-id' }, clock),
    update: new UpdateSecretUseCase(repository, encryption, policy, unitOfWork, events, clock),
    retrieve: new RetrieveSecretUseCase(repository, encryption, policy, unitOfWork, events, clock),
    retrieveMany: new RetrieveSecretsUseCase(repository, encryption, policy, unitOfWork, events, clock),
    list: new ListSecretMetadataUseCase(repository, policy),
    remove: new DeleteSecretUseCase(repository, policy, unitOfWork, events, clock),
  };
}
const scope = { projectId: 'p1', environmentId: 'e1' };
const E1 = { ...scope, context: alice };

describe('storing', () => {
  it('encrypts before the transaction and audits inside it', async () => {
    const s = setup();
    const view = await s.store.execute({ ...E1, key: 'DB_URL', value: 'v' });
    expect(s.log).toEqual(['encrypt:new-id', 'add', 'SecretCreated']);
    expect(view).toEqual({ id: 'new-id', key: 'DB_URL', encryptionKeyVersion: 2, createdAt: now, updatedAt: now });
  });
  it('writes nothing when encryption fails', async () => {
    const s = setup();
    s.fail.encrypt = true;
    await expect(s.store.execute({ ...E1, key: 'DB_URL', value: 'v' })).rejects.toMatchObject({ code: 'ENCRYPTION_UNAVAILABLE' });
    expect(s.log).toEqual(['encrypt:new-id']);
  });
  it('validates before encrypting', async () => {
    const s = setup();
    await expect(s.store.execute({ ...E1, key: 'bad', value: 'v' })).rejects.toMatchObject({ code: 'SECRET_KEY_INVALID' });
    await expect(s.store.execute({ ...E1, key: 'OK', value: '\ud800' })).rejects.toMatchObject({ code: 'SECRET_VALUE_INVALID' });
    expect(s.log).toEqual([]);
  });
});

describe('updating and deleting', () => {
  it('re-encrypts under the same identity', async () => {
    const s = setup();
    await s.update.execute({ ...E1, secretId: 's1', value: 'v' });
    expect(s.log).toEqual(['encrypt:s1', 'save', 'SecretUpdated']);
  });
  it('audits deletion', async () => {
    const s = setup();
    await s.remove.execute({ ...E1, secretId: 's1' });
    expect(s.log).toEqual(['remove', 'SecretDeleted']);
  });
  it('does not find unknown secrets', async () => {
    const s = setup();
    await expect(s.update.execute({ ...E1, secretId: 'nope', value: 'v' })).rejects.toMatchObject({ code: 'SECRET_NOT_FOUND' });
    await expect(s.remove.execute({ ...E1, secretId: 'nope' })).rejects.toMatchObject({ code: 'SECRET_NOT_FOUND' });
    expect(s.log).toEqual([]);
  });
});

describe('retrieving', () => {
  it('audits before returning the value', async () => {
    const s = setup();
    const view = await s.retrieve.execute({ ...E1, secretId: 's1' });
    expect(view.value).toBe('value-of-s1');
    expect(s.log).toEqual(['decrypt:s1', 'SecretAccessed']);
  });
  it('returns nothing when the access cannot be audited', async () => {
    const s = setup();
    s.fail.publish = true;
    await expect(s.retrieve.execute({ ...E1, secretId: 's1' })).rejects.toThrow('audit down');
    await expect(s.retrieveMany.execute({ ...E1, keys: null })).rejects.toThrow('audit down');
  });
  it('audits each secret of a bulk read', async () => {
    const s = setup();
    const views = await s.retrieveMany.execute({ ...E1, keys: null });
    expect(views.map((v) => [v.key, v.value])).toEqual([['KEY_0', 'value-of-s0'], ['KEY_1', 'value-of-s1']]);
    expect(s.log.filter((l) => l === 'SecretAccessed')).toHaveLength(2);
  });
  it('is all or nothing', async () => {
    const s = setup();
    s.fail.decrypt = 's1';
    await expect(s.retrieveMany.execute({ ...E1, keys: null })).rejects.toMatchObject({ code: 'SECRET_INTEGRITY_FAILURE' });
    expect(s.log).not.toContain('SecretAccessed');
  });
  it('names unknown keys', async () => {
    await expect(setup().retrieveMany.execute({ ...E1, keys: ['KEY_0', 'NOPE'] })).rejects.toMatchObject({
      code: 'SECRET_NOT_FOUND',
      kind: 'not_found',
      message: expect.stringContaining('NOPE'),
    });
  });
  it('accepts 100 secrets and refuses 101', async () => {
    expect(await setup(100).retrieveMany.execute({ ...E1, keys: null })).toHaveLength(100);
    await expect(setup(101).retrieveMany.execute({ ...E1, keys: null })).rejects.toMatchObject({ code: 'TOO_MANY_SECRETS', kind: 'invalid' });
  });
  it('limits concurrent decryptions', async () => {
    const s = setup(100);
    await s.retrieveMany.execute({ ...E1, keys: null });
    expect(s.log.filter((l) => l.startsWith('decrypt:'))).toHaveLength(100);
    expect(s.load.peak).toBe(10);
  });
  it('lists metadata without touching the engine', async () => {
    const s = setup();
    const list = await s.list.execute(E1);
    expect(Object.keys(list[0] ?? {}).sort()).toEqual(['createdAt', 'encryptionKeyVersion', 'id', 'key', 'updatedAt']);
    expect(s.log).toEqual([]);
  });
});

describe('SecretAccessPolicy', () => {
  it.each<[string, RequestContext, { projectId: string; environmentId: string }, 'SECRETS_READ' | 'SECRETS_WRITE', string | null]>([
    ['owner reads', alice, scope, 'SECRETS_READ', null],
    ['owner writes', alice, scope, 'SECRETS_WRITE', null],
    ['stranger', bob, scope, 'SECRETS_READ', 'PROJECT_NOT_FOUND'],
    ['environment outside the project', alice, { ...scope, environmentId: 'e9' }, 'SECRETS_READ', 'ENVIRONMENT_NOT_FOUND'],
    ['key of another project', key([{ environmentId: 'e1', permissions: ['SECRETS_READ'] }], 'p2'), scope, 'SECRETS_READ', 'PROJECT_NOT_FOUND'],
    ['key without grants', key([]), scope, 'SECRETS_READ', 'PERMISSION_DENIED'],
    ['key granted elsewhere', READ, { ...scope, environmentId: 'e2' }, 'SECRETS_READ', 'PERMISSION_DENIED'],
    ['read key reads', READ, scope, 'SECRETS_READ', null],
    ['read key writes', READ, scope, 'SECRETS_WRITE', 'PERMISSION_DENIED'],
    ['write key writes', WRITE, scope, 'SECRETS_WRITE', null],
    ['write key reads', WRITE, scope, 'SECRETS_READ', 'PERMISSION_DENIED'],
  ])('%s', async (_name, context, where, permission, code) => {
    const result = setup().policy.assert(context, where, permission);
    if (code) await expect(result).rejects.toMatchObject({ code });
    else await result;
  });

  it('guards every use case with the right permission', async () => {
    const s = setup();
    const denied = { code: 'PERMISSION_DENIED' };
    await expect(s.store.execute({ ...scope, context: READ, key: 'A', value: '' })).rejects.toMatchObject(denied);
    await expect(s.update.execute({ ...scope, context: READ, secretId: 's1', value: '' })).rejects.toMatchObject(denied);
    await expect(s.remove.execute({ ...scope, context: READ, secretId: 's1' })).rejects.toMatchObject(denied);
    await expect(s.retrieve.execute({ ...scope, context: WRITE, secretId: 's1' })).rejects.toMatchObject(denied);
    await expect(s.retrieveMany.execute({ ...scope, context: WRITE, keys: null })).rejects.toMatchObject(denied);
    await expect(s.list.execute({ ...scope, context: WRITE })).rejects.toMatchObject(denied);
    expect(s.log).toEqual([]);
  });
});
