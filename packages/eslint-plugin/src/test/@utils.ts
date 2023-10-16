import {existsSync, readFileSync} from 'fs';
import {join} from 'path';

import {TSESLint} from '@typescript-eslint/utils';

export function createTypeUnawareTester(): TSESLint.RuleTester {
  return new TSESLint.RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2018,
      sourceType: 'module',
    },
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createTestCaseBuilder<TRule extends {meta: {messages: object}}>(
  ruleName: string,
) {
  const dir = join(__dirname, '../../test-cases', ruleName);

  type MessageId = Extract<keyof TRule['meta']['messages'], string>;

  return createTestCase;

  function createTestCase(fileName: string): TSESLint.ValidTestCase<unknown[]>;
  function createTestCase(
    fileName: string,
    errors: TSESLint.TestCaseError<MessageId>[],
  ): TSESLint.InvalidTestCase<MessageId, unknown[]>;
  function createTestCase(
    fileName: string,
    errors?: TSESLint.TestCaseError<MessageId>[],
  ):
    | TSESLint.ValidTestCase<unknown[]>
    | TSESLint.InvalidTestCase<MessageId, unknown[]> {
    const path = join(dir, fileName);

    const lintFilePath = `${path}.lint`;

    const code = readFileSync(
      existsSync(lintFilePath) ? lintFilePath : path,
      'utf8',
    );

    if (errors) {
      const fixFilePath = `${path}.fix`;

      const output = existsSync(fixFilePath)
        ? readFileSync(fixFilePath, 'utf8')
        : undefined;

      return {
        name: fileName,
        filename: path,
        code,
        errors,
        output,
      };
    } else {
      return {
        name: fileName,
        filename: path,
        code,
      };
    }
  }
}
