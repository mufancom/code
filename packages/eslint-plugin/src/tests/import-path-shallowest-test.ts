import {rules} from '../rules';

import {
  RuleTester,
  getTestFileContent,
  getTestFileFullPath,
  getTestsDirPath,
} from './@utils';

const RULE_NAME = 'import-path-shallowest';

const TEST_DIR_PATH = getTestsDirPath(RULE_NAME);

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
});

ruleTester.run(RULE_NAME, rules[RULE_NAME], {
  valid: [
    {
      code: getTestFileContent(TEST_DIR_PATH, 'foo/test.ts.lint'),
      filename: getTestFileFullPath(TEST_DIR_PATH, 'foo/test.ts.lint'),
    },
    {
      code: getTestFileContent(TEST_DIR_PATH, 'bar/test.ts.lint'),
      filename: getTestFileFullPath(TEST_DIR_PATH, 'bar/test.ts.lint'),
    },
    {
      code: getTestFileContent(TEST_DIR_PATH, 'bar/he/c.ts.lint'),
      filename: getTestFileFullPath(TEST_DIR_PATH, 'bar/he/c.ts.lint'),
    },
    {
      code: getTestFileContent(TEST_DIR_PATH, 'core/test.ts.lint'),
      filename: getTestFileFullPath(TEST_DIR_PATH, 'core/test.ts.lint'),
    },
    {
      code: getTestFileContent(TEST_DIR_PATH, 'core/b/test.ts.lint'),
      filename: getTestFileFullPath(TEST_DIR_PATH, 'core/b/test.ts.lint'),
    },
    {
      code: getTestFileContent(TEST_DIR_PATH, 'core/b/c/test.ts.lint'),
      filename: getTestFileFullPath(TEST_DIR_PATH, 'core/b/c/test.ts.lint'),
    },
  ],
  invalid: [
    {
      code: getTestFileContent(TEST_DIR_PATH, 'test.ts.lint'),
      filename: getTestFileFullPath(TEST_DIR_PATH, 'test.ts.lint'),
      output: getTestFileContent(TEST_DIR_PATH, 'test.ts.fix'),
      errors: [
        {messageId: 'canNotImportDirectoryModules', line: 1},
        {messageId: 'canNotImportDirectoryModules', line: 3},
        {messageId: 'canNotImportDirectoryModules', line: 5},
      ],
    },
  ],
});
