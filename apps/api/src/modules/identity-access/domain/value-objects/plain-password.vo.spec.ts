import { inspect } from 'node:util';
import { PlainPassword } from './plain-password.vo.js';

describe('PlainPassword', () => {
  it.each([12, 128])('accepts %d characters', (n) => {
    expect(PlainPassword.create('x'.repeat(n)).reveal()).toHaveLength(n);
  });
  it.each([11, 129])('rejects %d characters', (n) => {
    expect(() => PlainPassword.create('x'.repeat(n))).toThrow(expect.objectContaining({ code: 'PASSWORD_INVALID' }));
  });
  it('cannot be printed by accident', () => {
    const password = PlainPassword.create('correct horse battery');
    expect(`${password} ${JSON.stringify(password)} ${inspect(password)}`).not.toContain('horse');
  });
});
