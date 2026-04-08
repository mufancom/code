import js from '@eslint/js';
import type {Linter} from 'eslint';
import * as importPlugin from 'eslint-plugin-import-x';
import globals from 'globals';

import {NO_UNUSED_VARS_OPTIONS} from './@common.js';

export const JAVASCRIPT_RULES: Linter.RulesRecord = {
  '@mufan/scoped-modules': 'error',
  '@mufan/import': 'error',
  'import-x/no-cycle': 'error',
  'import-x/no-extraneous-dependencies': [
    'error',
    {
      devDependencies: false,
      optionalDependencies: false,
    },
  ],
  'import-x/no-named-as-default': 'off',
  'import-x/no-named-as-default-member': 'off',
  'import-x/no-relative-packages': 'error',
  'import-x/no-self-import': 'error',
  // https://github.com/import-js/eslint-plugin-import/issues/1810
  'import-x/no-unresolved': 'off',
  'import-x/no-useless-path-segments': 'error',
  'import-x/order': [
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
  quotes: ['error', 'single', {avoidEscape: true}],
  'sort-imports': ['error', {ignoreDeclarationSort: true}],
};

export const javascript: Linter.Config[] = [
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  {
    name: '@mufan/javascript',
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
    },
    rules: JAVASCRIPT_RULES,
  },
];
