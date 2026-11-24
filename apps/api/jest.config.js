const base = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2022',
        },
        module: { type: 'es6' },
      },
    ],
  },
  modulePathIgnorePatterns: ['<rootDir>/dist'],
};
export { base };
export default { ...base, testRegex: '\\.spec\\.ts$', testPathIgnorePatterns: ['/node_modules/', '/fixtures/'] };
