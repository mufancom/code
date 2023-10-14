import type {Linter} from 'eslint';

import {NO_UNUSED_VARS_IGNORE_PATTERN} from './@common.js';

export default {
  extends: [
    'plugin:@mufan/javascript',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': {
      typescript: true,
    },
  },
  rules: {
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {allowExpressions: true},
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {varsIgnorePattern: NO_UNUSED_VARS_IGNORE_PATTERN},
    ],
  },
} satisfies Linter.Config;
