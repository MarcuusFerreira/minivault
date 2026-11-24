import { format, inspect } from 'node:util';
import { SecretValue } from './secret-value.vo.js';

describe('SecretValue', () => {
  it.each(['', 'a\n', ' padded ', '🔐', 'x'.repeat(32768), 'é'.repeat(16384), 'nul\u0000byte'])('keeps case %# untouched', (raw) => {
    expect(SecretValue.create(raw).reveal()).toBe(raw);
  });
  it.each(['x'.repeat(32769), 'é'.repeat(16385), '\ud800', 'a\udc00b'])('rejects case %#', (raw) => {
    expect(() => SecretValue.create(raw)).toThrow(expect.objectContaining({ code: 'SECRET_VALUE_INVALID' }));
  });
  it('cannot be printed by accident', () => {
    const value = SecretValue.create('CANARY-9f3c');
    const printed = [`${value}`, JSON.stringify({ value }), inspect(value, { showHidden: true }), format('%s %o %j', value, value, value), String(value)];
    expect(printed.join()).not.toContain('CANARY');
    expect(printed.join()).toContain('[REDACTED]');
  });
});
