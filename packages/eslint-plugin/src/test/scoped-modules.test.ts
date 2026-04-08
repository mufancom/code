import plugin from '../library/index.js';

import {createTestCaseBuilder, createTypeUnawareTester} from './@utils.js';

const RULE_NAME = 'scoped-modules';

const RULE = plugin.rules[RULE_NAME];

const builder = createTestCaseBuilder<typeof RULE>(RULE_NAME);

createTypeUnawareTester().run(RULE_NAME, RULE, {
  valid: [builder('export-as-namespace/1/index.ts')],
  invalid: [
    builder('banned-exports/@test.ts', [
      {messageId: 'bannedExport', line: 3},
      {messageId: 'bannedExport', line: 5},
    ]),
    builder('banned-exports/test.ts', [{messageId: 'bannedExport', line: 2}]),
    builder('banned-exports/test2.ts', [{messageId: 'bannedExport', line: 1}]),
    builder('banned-imports/test.ts', [
      {messageId: 'bannedImport', line: 1},
      {messageId: 'bannedImport', line: 2},
    ]),
    builder('exclude-test-module-in-fix/index.ts', [
      {messageId: 'missingExports'},
    ]),
    builder('missing-all-imports/index.ts', [{messageId: 'missingExports'}]),
    builder('missing-some-imports/index.ts', [{messageId: 'missingExports'}]),
    builder('export-namespace/1/index.ts', [
      {messageId: 'bannedImportWhenNamespaceExists'},
    ]),
    builder('export-namespace/1/namespace.ts', [{messageId: 'missingExports'}]),
    builder('export-namespace/2/namespace.ts', [{messageId: 'bannedExport'}]),
    builder('export-namespace/2/index.ts', [{messageId: 'missingImports'}]),
  ],
});
