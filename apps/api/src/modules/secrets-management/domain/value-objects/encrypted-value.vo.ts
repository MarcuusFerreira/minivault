import { InvalidEncryptedValueError } from '../exceptions/secret.errors.js';

/** Ciphertext, nonce and key version always change together. */
export class EncryptedValue {
  private constructor(
    readonly ciphertext: Uint8Array,
    readonly nonce: Uint8Array,
    readonly keyVersion: number,
  ) {}

  static create(input: { ciphertext: Uint8Array; nonce: Uint8Array; keyVersion: number }): EncryptedValue {
    const { ciphertext, nonce, keyVersion } = input;
    if (nonce.length !== 12 || ciphertext.length < 16 || !Number.isInteger(keyVersion) || keyVersion < 1) {
      throw new InvalidEncryptedValueError();
    }
    return new EncryptedValue(ciphertext, nonce, keyVersion);
  }
}
