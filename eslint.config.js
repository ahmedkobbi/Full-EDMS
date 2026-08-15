// ESLint flat config for Smart EDMS monorepo.
// Spec ref: §27.1 (Code Quality), §24.1 (testing — lint in CI).
//
// This is a minimal config — individual workspaces can extend it.
{
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Spec §27.1: avoid `any` unless explicitly justified
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'off', // too strict for Prisma
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',

    // Spec §27.1: no unused locals
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    // Code quality
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],

    // Import order (loose)
    'sort-imports': ['warn', { ignoreCase: true, ignoreDeclarationSort: true }],
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    '.next',
    'coverage',
    '*.js',
    '*.d.ts',
    'apps/electron/dist',
    'apps/electron/release',
  ],
};
