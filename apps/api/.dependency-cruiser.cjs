/**
 * Machine-checked hexagonal architecture rules (brief section 16).
 * Each rule is proven by a fixture in test/architecture/fixtures.
 */
const DOMAIN = '/modules/[^/]+/domain/';
const APPLICATION = '/modules/[^/]+/application/';
const SHARED_CORE = '/shared/(domain|application)/';
const FRAMEWORKS = [
  '^node:http',
  '^https?$',
  'node_modules/(@nestjs|@prisma|prisma|express|zod|rxjs|pg|reflect-metadata|@node-rs)(/|$)',
  '^(@nestjs|@prisma|prisma|express|zod|rxjs|pg|reflect-metadata|@node-rs)(/|$)',
  '/generated/prisma/',
  'packages/contracts',
  '^@minivault/contracts',
];
const TEST = '\\.spec\\.ts$';

module.exports = {
  forbidden: [
    {
      name: 'domain-no-framework',
      severity: 'error',
      comment: 'The domain is framework-agnostic.',
      from: { path: [DOMAIN, '/shared/domain/'], pathNot: TEST },
      to: { path: FRAMEWORKS },
    },
    {
      name: 'domain-no-outer-layer',
      severity: 'error',
      comment: 'The domain never depends on application or infrastructure.',
      from: { path: [DOMAIN, '/shared/domain/'], pathNot: TEST },
      to: { path: '/(application|infrastructure)/' },
    },
    {
      name: 'application-no-framework',
      severity: 'error',
      comment: 'Use cases depend only on the domain and on abstractions.',
      from: { path: [APPLICATION, '/shared/application/'], pathNot: TEST },
      to: { path: FRAMEWORKS },
    },
    {
      name: 'application-no-infrastructure',
      severity: 'error',
      from: { path: [APPLICATION, '/shared/application/'], pathNot: TEST },
      to: { path: ['/infrastructure/', '/config/'] },
    },
    {
      name: 'no-cross-context-except-input-ports',
      severity: 'error',
      comment: 'Only infrastructure may reach another context, and only through its input ports.',
      from: { path: '/modules/([^/]+)/infrastructure/' },
      to: {
        path: '/modules/([^/]+)/',
        pathNot: ['/modules/$1/', '/modules/[^/]+/application/ports/input/', '/modules/[^/]+/[^/]+\\.module\\.ts$'],
      },
    },
    {
      name: 'no-cross-context-except-input-ports',
      severity: 'error',
      from: { path: '/modules/([^/]+)/(domain|application)/' },
      to: { path: '/modules/([^/]+)/', pathNot: '/modules/$1/' },
    },
    {
      name: 'controllers-no-persistence',
      severity: 'error',
      comment: 'Input adapters reach the application only through input ports.',
      from: { path: '/adapters/input/', pathNot: TEST },
      to: { path: ['/adapters/output/', '/domain/repositories/'] },
    },
    {
      name: 'prisma-only-in-persistence',
      severity: 'error',
      from: {
        path: '/modules/|/shared/',
        pathNot: ['/adapters/output/persistence/', '/shared/infrastructure/prisma/', '/fixtures/', TEST],
      },
      to: { path: ['node_modules/@prisma/', '/generated/prisma/'] },
    },
    { name: 'no-circular', severity: 'error', from: { pathNot: '/generated/' }, to: { circular: true } },
    { name: 'not-to-unresolvable', severity: 'error', from: { pathNot: '/fixtures/' }, to: { couldNotResolve: true } },
  ],
  options: {
    doNotFollow: { path: ['node_modules', '/generated/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'node', 'default', 'types'],
    },
  },
};
