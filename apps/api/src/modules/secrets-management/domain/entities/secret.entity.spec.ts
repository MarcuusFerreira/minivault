import { EncryptedValue } from '../value-objects/encrypted-value.vo.js';
import { SecretKey } from '../value-objects/secret-key.vo.js';
import { Secret } from './secret.entity.js';

const sealed = (keyVersion: number) => EncryptedValue.create({ ciphertext: new Uint8Array(16), nonce: new Uint8Array(12), keyVersion });

it('records every sensitive operation without any value', () => {
  const secret = Secret.create({ id: 's', projectId: 'p', environmentId: 'e', key: SecretKey.create('K'), value: sealed(1), now: new Date(0) });
  secret.replaceValue(sealed(2), new Date(1));
  secret.recordAccess(new Date(2));
  secret.markDeleted(new Date(3));
  expect(secret.encryptedValue.keyVersion).toBe(2);
  expect(secret.updatedAt).toEqual(new Date(1));
  const events = secret.pullEvents();
  expect(events.map((e) => e.name)).toEqual(['SecretCreated', 'SecretUpdated', 'SecretAccessed', 'SecretDeleted']);
  for (const event of events) {
    expect(Object.keys(event).sort()).toEqual(['environmentId', 'key', 'name', 'occurredAt', 'projectId', 'secretId']);
  }
});
