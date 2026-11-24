import { SecretKey } from './secret-key.vo.js';

describe('SecretKey', () => {
  it.each(['DB_URL', '_X', 'A', 'X'.repeat(128)])('accepts %s', (raw) => {
    expect(SecretKey.create(raw).value).toBe(raw);
  });
  it.each(['db', '1A', 'A-B', '', 'A B', 'A\n', 'X'.repeat(129), 'ÁB'])('rejects %j', (raw) => {
    expect(() => SecretKey.create(raw)).toThrow(expect.objectContaining({ code: 'SECRET_KEY_INVALID' }));
  });
});
