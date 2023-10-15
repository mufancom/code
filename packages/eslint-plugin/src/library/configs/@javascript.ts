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
    'import/no-cycle': 'error',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: false,
        optionalDependencies: false,
      },
    ],
    'import/no-relative-packages': 'error',
    'import/no-self-import': 'error',
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
    'no-unused-vars': ['error', NO_UNUSED_VARS_OPTIONS],
    'prefer-const': ['error', {destructuring: 'all'}],
    'prefer-template': 'error',
  },
} satisfies Linter.Config;
