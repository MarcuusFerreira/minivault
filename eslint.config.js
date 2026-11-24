import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/generated/**', '**/fixtures/**', '**/*.cjs', '**/*.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Dependency injection reads constructor types at run time, so injected classes must not be type-only imports.
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
    },
  },
);
