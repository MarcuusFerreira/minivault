import { EncryptedValue } from './encrypted-value.vo.js';

const make = (nonce: number, ciphertext: number, keyVersion: number) => () =>
  EncryptedValue.create({ nonce: new Uint8Array(nonce), ciphertext: new Uint8Array(ciphertext), keyVersion });

describe('EncryptedValue', () => {
  it('accepts the smallest valid value', () => {
    expect(make(12, 16, 1)().keyVersion).toBe(1);
  });
  it.each([[11, 16, 1], [13, 16, 1], [12, 15, 1], [12, 16, 0], [12, 16, 1.5]])('rejects nonce %d, ciphertext %d, version %d', (n, c, v) => {
    expect(make(n, c, v)).toThrow(expect.objectContaining({ code: 'ENCRYPTED_VALUE_INVALID' }));
  });
});
