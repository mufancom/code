import Path from 'path';

import {RuleTesterConfig} from '@typescript-eslint/utils/dist/ts-eslint';

import {rules} from '../rules';

import {
  RuleTester,
  getTestFileContent as _getTestFileContent,
  getTestFileFullPath as _getTestFileFullPath,
  getTestsDirPath as _getTestsDirPath,
} from './@utils';

const RULE_DIR = _getTestsDirPath('import-type-unification');

const getTestFilePath = _getTestFileFullPath.bind(undefined, RULE_DIR);

const getTestFileContent = _getTestFileContent.bind(undefined, RULE_DIR);

function getCachePath(testFilePath: string): string {
  return Path.join(Path.dirname(testFilePath), '.cache/rules/import-type-unification');
}

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
      code: getTestFileContent('test1.ts'),
      filename: getTestFilePath('test1.ts'),
      options: [{cachePath: getCachePath(getTestFilePath('test1.ts'))}],
      errors: [
        {messageId: 'importTypeNotUnified', line: 1},
        {messageId: 'importTypeNotUnified', line: 2},
      ],
    },
    {
      code: getTestFileContent('test2.ts'),
      filename: getTestFilePath('test2.ts'),
      options: [{cachePath: getCachePath(getTestFilePath('test2.ts'))}],
      errors: [
        {messageId: 'importTypeNotUnified', line: 5},
        {messageId: 'importTypeNotUnified', line: 6},
      ],
    },
    {
      code: getTestFileContent('test3.ts'),
      filename: getTestFilePath('test3.ts'),
      options: [
        {
          cachePath: getCachePath(getTestFilePath('test3.ts')),
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
          ],
        },
      ],
      errors: [
        {messageId: 'notMatchConfiguration', line: 6},
        {messageId: 'notMatchConfiguration', line: 7},
        {messageId: 'notMatchConfiguration', line: 8},
      ],
    },
    {
      code: getTestFileContent('test4.ts'),
      filename: getTestFilePath('test4.ts'),
      options: [
        {
          cachePath: getCachePath(getTestFilePath('test4.ts')),
          quickConfigs: [
            {
              modules: ['https'],
            },
            {
              modules: ['crypto'],
              defaultImportNamingType: 'as-is',
            },
            {
              modules: ['assert'],
              defaultImportNamingType: 'as-is-with-underscore',
            },
            {
              modules: ['url'],
              defaultImportNamingType: 'any',
            },
            {
              modules: ['buffer'],
              namedImportNamingType: 'as-is-with-underscore',
            },
            {
              modules: ['process', 'os'],
              namedImportNamingType: 'any',
            },
          ],
        },
      ],
      errors: [
        {messageId: 'notUnderQuickConfig', line: 12},
        {messageId: 'notUnderQuickConfig', line: 21, column: 30},
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
        code: getTestFileContent('test2.js'),
        filename: getTestFilePath('test2.js'),
        options: [
          {
            cachePath: getCachePath(getTestFilePath('test2.js')),
            configs: [
              {
                module: 'typescript',
                allow: ['default', 'namespace'],
              },
            ],
          },
        ],
      },
      {
        code: getTestFileContent('test3.js'),
        filename: getTestFilePath('test3.js'),
        options: [
          {
            cachePath: getCachePath(getTestFilePath('test3.js')),
            configs: [
              {
                module: './foo',
                allow: ['namespace'],
              },
            ],
          },
        ],
      },
    ],
    invalid: [
      {
        code: getTestFileContent('test1.js'),
        filename: getTestFilePath('test1.js'),
        options: [{cachePath: getCachePath(getTestFilePath('test1.js'))}],
        errors: [
          {messageId: 'importTypeNotUnified', line: 1},
          {messageId: 'importTypeNotUnified', line: 2},
        ],
      },
    ],
  },
);
