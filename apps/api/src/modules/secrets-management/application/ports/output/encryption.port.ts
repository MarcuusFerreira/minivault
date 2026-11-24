import type { EncryptedValue } from '../../../domain/value-objects/encrypted-value.vo.js';

/** A value encrypted in one context cannot be decrypted in another. */
export interface EncryptionContext {
  projectId: string;
  environmentId: string;
  secretId: string;
}

export interface EncryptionPort {
  /** Fails with ENCRYPTION_UNAVAILABLE. */
  encrypt(context: EncryptionContext, plaintext: string): Promise<EncryptedValue>;
  /** Fails with ENCRYPTION_UNAVAILABLE or SECRET_INTEGRITY_FAILURE. */
  decrypt(context: EncryptionContext, value: EncryptedValue): Promise<string>;
}
export const ENCRYPTION = Symbol('EncryptionPort');
