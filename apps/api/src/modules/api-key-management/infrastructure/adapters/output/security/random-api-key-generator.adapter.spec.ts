import { RandomApiKeyGenerator } from './random-api-key-generator.adapter.js';

describe('RandomApiKeyGenerator', () => {
  const generator = new RandomApiKeyGenerator();
  it('generates unique keys of the documented shape', () => {
    const keys = Array.from({ length: 1000 }, () => generator.generate());
    expect(new Set(keys.map((k) => k.plaintext)).size).toBe(1000);
    for (const { plaintext, hash, prefix } of keys) {
      expect(plaintext).toMatch(/^mv_[A-Za-z0-9_-]{43}$/);
      expect(prefix).toBe(plaintext.slice(0, 11));
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(generator.hash(plaintext)).toBe(hash);
    }
  });
  it.each(['', 'mv_', 'mv_short', 'x'.repeat(46), `mv_${'a'.repeat(44)}`, `mv_${'!'.repeat(43)}`])('does not hash malformed input %j', (raw) => {
    expect(generator.hash(raw)).toBeNull();
  });
});
