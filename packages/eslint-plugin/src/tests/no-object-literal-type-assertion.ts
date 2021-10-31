// eslint-disable-next-line @mufan/import-groups
import {rules} from '../rules';

import {RuleTester} from './@utils';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
});

ruleTester.run(
  'no-object-literal-type-assertion',
  rules['no-object-literal-type-assertion'],
  {
    valid: [
      {
        code: `
foo as Bar
            `,
      },
      {
        code: `
const a = <Bar>foo
            `,
      },
      {
        code: `
const a = {} as const
            `,
      },
      {
        code: `
const a = {foo: '' as Bar}
            `,
      },
      {
        code: `
[] as Bar
            `,
      },
    ],
    invalid: [
      {
        code: `
const a = {} as Bar
            `,
        errors: [{messageId: 'objectLiteralTypeAssertion'}],
      },
    ],
  },
);
