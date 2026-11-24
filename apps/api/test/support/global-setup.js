import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export default async function setup() {
  const postgres = await new PostgreSqlContainer('postgres:18-alpine').withTmpFs({ '/var/lib/postgresql': 'rw' }).start();
  globalThis.__postgres = postgres;
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: postgres.getConnectionUri(),
    JWT_SECRET: 'integration-test-jwt-secret-not-a-real-one',
    WEB_ORIGIN: 'http://localhost:8080',
    ENGINE_URL: 'http://127.0.0.1:1',
    ENGINE_AUTH_TOKEN: 'integration-test-engine-token-not-real',
    THROTTLE_LIMIT: '100000',
    AUTH_THROTTLE_LIMIT: '100000',
  });
  const root = join(import.meta.dirname, '..', '..');
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], { cwd: root, env: { ...process.env, NODE_OPTIONS: '' }, stdio: 'pipe' });
}
