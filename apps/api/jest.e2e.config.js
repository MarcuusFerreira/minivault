import { base } from './jest.config.js';
export default { ...base, testRegex: '\\.e2e-spec\\.ts$', testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/test/support/preload-nest.js'],
  globalSetup: '<rootDir>/test/support/global-setup.js',
  globalTeardown: '<rootDir>/test/support/global-teardown.js' };
