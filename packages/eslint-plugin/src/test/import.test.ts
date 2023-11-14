import {rules} from '../library/index.js';

import {createTestCaseBuilder, createTypeUnawareTester} from './@utils.js';

const RULE_NAME = 'import';

const RULE = rules[RULE_NAME];

const builder = createTestCaseBuilder<typeof RULE>(RULE_NAME);

createTypeUnawareTester().run(RULE_NAME, RULE, {
  valid: [
    builder('foo/test.ts'),
    builder('bar/test.ts'),
    builder('bar/he/c.ts'),
    builder('core/test.ts'),
    builder('core/b/test.ts'),
    builder('core/b/c/test.ts'),
  ],
  invalid: [
    builder('test.ts', [
      {messageId: 'unexpectedImportSpecifier', line: 1},
      {messageId: 'unexpectedImportSpecifier', line: 3},
      {messageId: 'unexpectedImportSpecifier', line: 5},
      {messageId: 'unexpectedImportSpecifier', line: 9},
      {messageId: 'unexpectedImportSpecifier', line: 11},
    ]),
  ],
});
