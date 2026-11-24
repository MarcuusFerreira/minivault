import { JwtService } from '@nestjs/jwt';
import { Argon2PasswordHasher } from './argon2-password-hasher.adapter.js';
import { JwtAccessTokenService } from './jwt-access-token.adapter.js';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();
  it('hashes with Argon2id and the documented parameters', async () => {
    const hash = await hasher.hash('correct horse battery');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await hasher.verify('correct horse battery', hash)).toBe(true);
    expect(await hasher.verify('something else here', hash)).toBe(false);
  });
  it('is false for a missing hash', async () => {
    expect(await hasher.verify('anything at all', null)).toBe(false);
  });
});

describe('JwtAccessTokenService', () => {
  const secret = 'unit-test-secret-unit-test-secret';
  const tokens = new JwtAccessTokenService(secret, 1800);
  const jwt = new JwtService();
  const claims = { secret, issuer: 'minivault', audience: 'minivault-api', subject: 'u1', expiresIn: 60 } as const;

  it('round-trips the user id', async () => {
    const { token, expiresIn } = await tokens.issue('u1');
    expect(expiresIn).toBe(1800);
    expect(await tokens.verify(token)).toBe('u1');
  });

  it.each([
    ['wrong secret', () => jwt.sign({}, { ...claims, secret: `${secret}x` })],
    ['wrong issuer', () => jwt.sign({}, { ...claims, issuer: 'other' })],
    ['wrong audience', () => jwt.sign({}, { ...claims, audience: 'other' })],
    ['expired', () => jwt.sign({}, { ...claims, expiresIn: -1 })],
    ['another HMAC algorithm', () => jwt.sign({}, { ...claims, algorithm: 'HS512' })],
    ['no subject', () => jwt.sign({}, { secret, issuer: 'minivault', audience: 'minivault-api', expiresIn: 60 })],
    ['garbage', () => 'abc.def.ghi'],
    [
      'alg none',
      () => {
        const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
        return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'u1', iss: 'minivault', aud: 'minivault-api', exp: 9999999999 })}.`;
      },
    ],
  ])('rejects %s', async (_name, make) => {
    expect(await tokens.verify(make())).toBeNull();
  });
});
