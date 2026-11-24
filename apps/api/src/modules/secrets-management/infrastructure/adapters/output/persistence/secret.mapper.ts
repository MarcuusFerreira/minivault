import type { Secret as SecretRow } from '../../../../../../generated/prisma/client.js';
import { Secret } from '../../../../domain/entities/secret.entity.js';
import { EncryptedValue } from '../../../../domain/value-objects/encrypted-value.vo.js';
import { SecretKey } from '../../../../domain/value-objects/secret-key.vo.js';

export const secretMapper = {
  toDomain: (row: SecretRow, projectId: string): Secret =>
    Secret.restore({
      id: row.id,
      projectId,
      environmentId: row.environmentId,
      key: SecretKey.create(row.key),
      encryptedValue: EncryptedValue.create({
        ciphertext: row.encryptedValue,
        nonce: row.nonce,
        keyVersion: row.encryptionKeyVersion,
      }),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  toRow: (secret: Secret): SecretRow => ({
    id: secret.id,
    environmentId: secret.environmentId,
    key: secret.key.value,
    // Copied into a plain ArrayBuffer, the only kind Prisma's types accept.
    encryptedValue: new Uint8Array(secret.encryptedValue.ciphertext),
    nonce: new Uint8Array(secret.encryptedValue.nonce),
    encryptionKeyVersion: secret.encryptedValue.keyVersion,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  }),
};
