import { envSchema } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
  WEB_ORIGIN: 'http://localhost:8080',
  ENGINE_URL: 'http://secrets-engine:8081',
  ENGINE_AUTH_TOKEN: 'y'.repeat(32),
};

describe('envSchema', () => {
  it('applies the documented defaults', () => {
    expect(envSchema.parse(valid)).toMatchObject({
      PORT: 3000,
      JWT_TTL_SECONDS: 1800,
      ENGINE_TIMEOUT_MS: 3000,
      THROTTLE_LIMIT: 100,
      AUTH_THROTTLE_LIMIT: 5,
    });
  });

  it('rejects a JWT secret of 31 characters', () => {
    expect(envSchema.safeParse({ ...valid, JWT_SECRET: 'x'.repeat(31) }).success).toBe(false);
  });

  it('rejects an engine token of 31 characters', () => {
    expect(envSchema.safeParse({ ...valid, ENGINE_AUTH_TOKEN: 'y'.repeat(31) }).success).toBe(false);
  });

  it('parses COOKIE_SECURE="false" as false', () => {
    expect(envSchema.parse({ ...valid, COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(false);
  });
});
