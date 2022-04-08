import * as Path from 'path';

import {rules} from '../rules';

import {
  RuleTester,
  getTestFileContent,
  getTestFileFullPath,
  getTestsDirPath,
} from './@utils';

const RULE_NAME = 'reference-missing-proof';

const TEST_DIR_PATH = getTestsDirPath(RULE_NAME);

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: Path.join(TEST_DIR_PATH, './packages/src1'),
  },
});

ruleTester.run(RULE_NAME, rules[RULE_NAME], {
  valid: [],
  invalid: [
    {
      code: getTestFileContent(TEST_DIR_PATH, './packages/src1/main.ts'),
      filename: getTestFileFullPath(TEST_DIR_PATH, './packages/src1/main.ts'),
      options: [{conditions: ['vite'], mainFields: ['main', 'module']}],
      errors: [
        {messageId: 'referenceMissing', line: 1},
        {messageId: 'referenceMissing', line: 5},
        {messageId: 'cannotResolve', line: 15},
      ],
    },
  ],
});
