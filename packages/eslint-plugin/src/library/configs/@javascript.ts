import type {Linter} from 'eslint';

import {NO_UNUSED_VARS_OPTIONS, VSCODE} from './@common.js';

export default {
  extends: ['eslint:recommended', 'plugin:import/recommended'],
  plugins: [VSCODE && 'only-warn', '@mufan'].filter(
    (name): name is string => typeof name === 'string',
  ),
  env: {
    node: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    '@mufan/scoped-modules': 'error',
    '@mufan/import-shallowest': 'error',
    'import/no-cycle': 'error',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: false,
        optionalDependencies: false,
      },
    ],
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
    'import/no-relative-packages': 'error',
    'import/no-self-import': 'error',
    // https://github.com/import-js/eslint-plugin-import/issues/1810
    'import/no-unresolved': 'off',
    'import/no-useless-path-segments': 'error',
    'import/order': [
      'error',
      {
        alphabetize: {
          order: 'asc',
          orderImportKind: 'asc',
        },
        'newlines-between': 'always',
      },
    ],
    'no-console': [
      'error',
      {
        allow: ['error', 'warn', 'info', 'debug', 'assert'],
      },
    ],
    'no-empty-pattern': 'off',
    'no-unused-vars': ['error', NO_UNUSED_VARS_OPTIONS],
    'no-useless-computed-key': 'error',
    'no-useless-rename': 'error',
    'object-shorthand': 'error',
    'prefer-const': ['error', {destructuring: 'all'}],
    'prefer-template': 'error',
    'sort-imports': ['error', {ignoreDeclarationSort: true}],
  },
} satisfies Linter.Config;
