import type {Linter} from 'eslint';

import {NO_UNUSED_VARS_OPTIONS} from './@common.js';

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
    '@typescript-eslint/ban-types': [
      'error',
      {
        extendDefaults: true,
        types: {
          Function: false,
          '{}': false,
        },
      },
    ],
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {allowExpressions: true},
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-unsafe-declaration-merging': 'off',
    '@typescript-eslint/no-useless-constructor': 'error',
    '@typescript-eslint/no-unused-vars': ['error', NO_UNUSED_VARS_OPTIONS],
    '@typescript-eslint/no-var-requires': 'off',
    'import/default': 'off',
    'import/export': 'off',
    'import/namespace': 'off',
  },
} satisfies Linter.Config;
