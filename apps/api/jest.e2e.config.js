import { base } from './jest.config.js';
export default { ...base, testRegex: '\\.e2e-spec\\.ts$', testTimeout: 60000 };
