import {RuleTesterConfig} from '@typescript-eslint/experimental-utils/dist/ts-eslint';

import {rules} from '../rules';

import {
  RuleTester,
  getTestFileContent as _getTestFileContent,
  getTestFileFullPath as _getTestFileFullPath,
  getTestsDirPath as _getTestsDirPath,
} from './@utils';

const RULE_DIR = _getTestsDirPath('import-type-unification');

const getTestFilePath = _getTestFileFullPath.bind(undefined, RULE_DIR);

const getTestFile = _getTestFileContent.bind(undefined, RULE_DIR);

const ruleTester1 = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: RULE_DIR,
  },
});

ruleTester1.run('import-type-unification', rules['import-type-unification'], {
  valid: [],
  invalid: [
    {
      code: getTestFile('test1.ts'),
      filename: getTestFilePath('test1.ts'),
      errors: [
        {messageId: 'importTypeNotUnified', line: 1},
        {messageId: 'importTypeNotUnified', line: 2},
      ],
    },
    {
      code: getTestFile('test2.ts'),
      filename: getTestFilePath('test2.ts'),
      errors: [
        {messageId: 'importTypeNotUnified', line: 5},
        {messageId: 'importTypeNotUnified', line: 6},
      ],
    },
    {
      code: getTestFile('test3.ts'),
      filename: getTestFilePath('test3.ts'),
      options: [
        {
          configs: [
            {
              module: 'http',
              allow: [
                {
                  type: 'default',
                  identifiers: '*',
                },
                'equals',
                {
                  type: 'namespace',
                  identifiers: ['http', 'httpp', 'htttp'],
                },
              ],
            },
            {
              module: 'https',
              allow: [{type: 'named', identifiers: 'identical'}],
            },
          ],
        },
      ],
      errors: [
        {messageId: 'importTypeNotUnified', line: 1},
        {messageId: 'importTypeNotUnified', line: 6},
        {messageId: 'importTypeNotUnified', line: 7},
        {messageId: 'importTypeNotUnified', line: 8},
        {messageId: 'importTypeNotUnified', line: 10, column: 9},
        {messageId: 'importTypeNotUnified', line: 10, column: 12},
        {messageId: 'importTypeNotUnified', line: 10, column: 15},
      ],
    },
    {
      code: getTestFile('test4.ts'),
      filename: getTestFilePath('test4.ts'),
      options: [
        {
          quickConfigs: [
            {
              modules: ['http'],
              allowDefaultAndNamedImport: false,
            },
            {
              modules: ['https'],
              allowDefaultAndNamedImport: true,
            },
            {
              modules: ['crypto'],
              allowDefaultAndNamedImport: true,
              defaultImportNamingType: 'as-is',
            },
            {
              modules: ['assert'],
              allowDefaultAndNamedImport: true,
              defaultImportNamingType: 'as-is-with-underscore',
            },
            {
              modules: ['url'],
              allowDefaultAndNamedImport: true,
              defaultImportNamingType: 'any',
            },
            {
              modules: ['buffer'],
              allowDefaultAndNamedImport: true,
              namedImportNamingType: 'as-is-with-underscore',
            },
            {
              modules: ['process', 'os'],
              allowDefaultAndNamedImport: true,
              namedImportNamingType: 'any',
            },
          ],
        },
      ],
      errors: [
        {messageId: 'importTypeNotUnified', line: 6, column: 8},
        {messageId: 'importTypeNotUnified', line: 6, column: 15},
        {messageId: 'importTypeNotUnified', line: 12},
        {messageId: 'importTypeNotUnified', line: 21, column: 30},
      ],
    },
  ],
});

const ruleTester2 = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
} as RuleTesterConfig);

ruleTester2.run(
  'import-type-unification with js parser',
  rules['import-type-unification'],
  {
    valid: [
      {
        code: getTestFile('test2.js'),
        filename: getTestFilePath('test2.js'),
        options: [
          {
            configs: [
              {
                module: 'fs',
                allow: ['default', 'namespace'],
              },
            ],
          },
        ],
      },
    ],
    invalid: [
      {
        code: getTestFile('test1.js'),
        filename: getTestFilePath('test1.js'),
        errors: [
          {messageId: 'importTypeNotUnified', line: 1},
          {messageId: 'importTypeNotUnified', line: 2},
        ],
      },
      {
        code: getTestFile('test3.js'),
        filename: getTestFilePath('test3.js'),
        options: [
          {
            configs: [
              {
                module: './foo',
                allow: ['namespace'],
              },
            ],
          },
        ],
        errors: [{messageId: 'importTypeNotUnified', line: 2}],
      },
    ],
  },
);
