import js from '@eslint/js';
import type {Linter} from 'eslint';
import * as importPlugin from 'eslint-plugin-import-x';
import globals from 'globals';
import * as tseslint from 'typescript-eslint';

import {NO_UNUSED_VARS_OPTIONS} from './@common.js';
import {JAVASCRIPT_RULES} from './javascript.js';

const TYPESCRIPT_RULES: Linter.RulesRecord = {
  ...JAVASCRIPT_RULES,
  'no-unused-vars': 'off',
  '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
  '@typescript-eslint/consistent-type-exports': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/explicit-function-return-type': [
    'error',
    {allowExpressions: true},
  ],
  '@typescript-eslint/no-empty-object-type': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-namespace': 'off',
  '@typescript-eslint/no-this-alias': 'off',
  '@typescript-eslint/no-unsafe-function-type': 'off',
  '@typescript-eslint/no-unsafe-declaration-merging': 'off',
  '@typescript-eslint/no-useless-constructor': 'error',
  '@typescript-eslint/no-unused-vars': ['error', NO_UNUSED_VARS_OPTIONS],
  '@typescript-eslint/no-var-requires': 'off',
  '@typescript-eslint/no-wrapper-object-types': 'error',
  'import-x/default': 'off',
  'import-x/export': 'off',
  'import-x/namespace': 'off',
};

export const typescript: Linter.Config[] = [
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  ...tseslint.configs.recommended,
  {
    name: '@mufan/typescript',
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parser: tseslint.parser,
    },
    settings: {
      'import-x/resolver': {
        typescript: true,
      },
    },
    rules: TYPESCRIPT_RULES,
  },
];
