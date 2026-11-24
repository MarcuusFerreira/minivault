import { randomUUID } from 'node:crypto';
import { GoCryptoAdapter } from '../src/modules/secrets-management/infrastructure/adapters/output/cryptography/go-crypto.adapter.js';

describe('GoCryptoAdapter against the real engine', () => {
  const adapter = new GoCryptoAdapter({
    baseUrl: process.env.ENGINE_URL ?? '',
    token: process.env.ENGINE_AUTH_TOKEN ?? '',
    timeoutMs: 3000,
  });
  const context = { projectId: randomUUID(), environmentId: randomUUID(), secretId: randomUUID() };

  it.each(['', 'áé🔐\n', 'x'.repeat(32768)])('round-trips case %#', async (plaintext) => {
    expect(await adapter.decrypt(context, await adapter.encrypt(context, plaintext))).toBe(plaintext);
  });

  it.each(['projectId', 'environmentId', 'secretId'])('cannot decrypt with another %s', async (field) => {
    const sealed = await adapter.encrypt(context, 'value');
    await expect(adapter.decrypt({ ...context, [field]: randomUUID() }, sealed)).rejects.toMatchObject({ code: 'SECRET_INTEGRITY_FAILURE' });
  });

  it('is refused with the wrong service token', async () => {
    const intruder = new GoCryptoAdapter({ baseUrl: process.env.ENGINE_URL ?? '', token: 'wrong', timeoutMs: 3000 });
    await expect(intruder.encrypt(context, 'value')).rejects.toMatchObject({ code: 'ENCRYPTION_UNAVAILABLE' });
  });
});
