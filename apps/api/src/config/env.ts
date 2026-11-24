import { z } from 'zod';

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: positiveInt(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_TTL_SECONDS: positiveInt(1800),
  WEB_ORIGIN: z.url(),
  COOKIE_SECURE: z.stringbool().default(false),
  ENGINE_URL: z.url(),
  ENGINE_AUTH_TOKEN: z.string().min(32),
  ENGINE_TIMEOUT_MS: positiveInt(3000),
  THROTTLE_LIMIT: positiveInt(100),
  AUTH_THROTTLE_LIMIT: positiveInt(5),
});

export type Env = z.infer<typeof envSchema>;
