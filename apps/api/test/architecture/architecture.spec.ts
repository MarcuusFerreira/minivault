import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const apiRoot = join(import.meta.dirname, '..', '..');
const fixtures = 'test/architecture/fixtures';

interface Violation {
  from: string;
  to: string;
  rule: { name: string; severity: string };
}

function cruise(target: string): Violation[] {
  const result = spawnSync(
    process.execPath,
    [
      join(apiRoot, '..', '..', 'node_modules', 'dependency-cruiser', 'bin/dependency-cruiser.mjs'),
      target,
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'json',
    ],
    { cwd: apiRoot, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } },
  );
  if (!result.stdout.trim().startsWith('{')) {
    throw new Error(`dependency-cruiser did not run: ${result.stderr}`);
  }
  return (JSON.parse(result.stdout) as { summary: { violations: Violation[] } }).summary.violations;
}

describe('architecture', () => {
  it('source code has no violations', () => {
    expect(cruise('src')).toEqual([]);
  }, 30000);

  // The rules are only trustworthy if each one is seen failing on code that breaks it.
  const violations = new Map<string, Set<string>>();
  beforeAll(() => {
    for (const violation of cruise(fixtures)) {
      const file = violation.from.split('/').pop() ?? '';
      violations.set(file, (violations.get(file) ?? new Set()).add(violation.rule.name));
    }
  }, 30000);

  it.each([
    ['uses-framework.entity.ts', 'domain-no-framework'],
    ['uses-application.entity.ts', 'domain-no-outer-layer'],
    ['uses-framework.use-case.ts', 'application-no-framework'],
    ['uses-prisma.use-case.ts', 'application-no-framework'],
    ['uses-infrastructure.use-case.ts', 'application-no-infrastructure'],
    ['uses-foreign-domain.adapter.ts', 'no-cross-context-except-input-ports'],
    ['uses-foreign-port.use-case.ts', 'no-cross-context-except-input-ports'],
    ['uses-repository.controller.ts', 'controllers-no-persistence'],
    ['uses-prisma-adapter.controller.ts', 'controllers-no-persistence'],
    ['cycle-a.ts', 'no-circular'],
  ])('%s violates %s', (file, rule) => {
    expect([...(violations.get(file) ?? [])]).toContain(rule);
  });

  it('allows an infrastructure adapter to call another context through its input port', () => {
    expect(violations.get('uses-foreign-port.adapter.ts')).toBeUndefined();
  });
});
