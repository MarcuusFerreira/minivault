import { Email } from './email.vo.js';

describe('Email', () => {
  it('normalizes case and surrounding space', () => {
    expect(Email.create('  A@B.Co ').value).toBe('a@b.co');
  });
  it.each(['a', '', '@b.co', 'a@', 'a b@c.co', `${'x'.repeat(250)}@b.co`])('rejects %j', (raw) => {
    expect(() => Email.create(raw)).toThrow(expect.objectContaining({ code: 'EMAIL_INVALID' }));
  });
});
