import {TSESLint} from '@typescript-eslint/utils';

import {createTestCaseBuilder} from './@utils.js';

import {rules} from '@mufan/eslint-plugin';

const RULE_NAME = 'scoped-modules';

const RULE = rules[RULE_NAME];

const builder = createTestCaseBuilder<typeof RULE>(RULE_NAME);

new TSESLint.RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
}).run(RULE_NAME, RULE, {
  valid: [builder('export-as-namespace/1', 'index.ts')],
  invalid: [
    builder('banned-exports', '@test.ts', [
      {messageId: 'bannedExport', line: 3},
      {messageId: 'bannedExport', line: 5},
    ]),
    builder('banned-exports', '@test.ts', [
      {messageId: 'bannedExport', line: 3},
      {messageId: 'bannedExport', line: 5},
    ]),
    builder('banned-exports', 'test.ts', [
      {messageId: 'bannedExport', line: 2},
    ]),
    builder('banned-exports', 'test2.ts', [
      {messageId: 'bannedExport', line: 1},
    ]),
    builder('banned-imports', 'test.ts', [
      {messageId: 'bannedImport', line: 1},
      {messageId: 'bannedImport', line: 2},
    ]),
    builder('missing-all-imports', 'index.ts', [{messageId: 'missingExports'}]),
    builder('missing-some-imports', 'index.ts', [
      {messageId: 'missingExports'},
    ]),
    builder('export-namespace/1', 'index.ts', [
      {messageId: 'bannedImportWhenNamespaceExists'},
    ]),
    builder('export-namespace/1', 'namespace.ts', [
      {messageId: 'missingExports'},
    ]),
    builder('export-namespace/2', 'namespace.ts', [
      {messageId: 'bannedExport'},
    ]),
    builder('export-namespace/2', 'index.ts', [{messageId: 'missingImports'}]),
  ],
});
