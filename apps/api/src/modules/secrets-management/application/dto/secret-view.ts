import type { Secret } from '../../domain/entities/secret.entity.js';

export interface SecretMetadata {
  id: string;
  key: string;
  encryptionKeyVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
export type RevealedSecret = SecretMetadata & { value: string };

export function toSecretMetadata(secret: Secret): SecretMetadata {
  return {
    id: secret.id,
    key: secret.key.value,
    encryptionKeyVersion: secret.encryptedValue.keyVersion,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  };
}
