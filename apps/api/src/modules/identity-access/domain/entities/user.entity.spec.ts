import { Email } from '../value-objects/email.vo.js';
import { User } from './user.entity.js';

it('never serializes the password hash', () => {
  const user = User.register({ id: 'u', name: ' Ana ', email: Email.create('a@b.co'), passwordHash: '$argon2id$hash', now: new Date(0) });
  expect(user.name).toBe('Ana');
  expect(JSON.stringify(user)).not.toContain('argon2id');
});
