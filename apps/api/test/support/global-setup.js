import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait } from 'testcontainers';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export default async function setup() {
  const postgres = await new PostgreSqlContainer('postgres:18-alpine').withTmpFs({ '/var/lib/postgresql': 'rw' }).start();
  globalThis.__postgres = postgres;
  const engineToken = randomBytes(32).toString('hex');
  const image = await GenericContainer.fromDockerfile(join(import.meta.dirname, '../../../../services/secrets-engine')).build(
    'minivault-engine:test',
    { deleteOnExit: false },
  );
  const engine = await image
    .withEnvironment({
      ENGINE_AUTH_TOKEN: engineToken,
      MASTER_KEYS: `1:${randomBytes(32).toString('base64')}`,
      ACTIVE_KEY_VERSION: '1',
    })
    .withExposedPorts(8081)
    .withWaitStrategy(Wait.forHttp('/health', 8081))
    .start();
  globalThis.__engine = engine;
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: postgres.getConnectionUri(),
    JWT_SECRET: 'integration-test-jwt-secret-not-a-real-one',
    WEB_ORIGIN: 'http://localhost:8080',
    ENGINE_URL: `http://${engine.getHost()}:${engine.getMappedPort(8081)}`,
    ENGINE_AUTH_TOKEN: engineToken,
    THROTTLE_LIMIT: '100000',
    AUTH_THROTTLE_LIMIT: '100000',
  });
  const root = join(import.meta.dirname, '..', '..');
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], { cwd: root, env: { ...process.env, NODE_OPTIONS: '' }, stdio: 'pipe' });
}
