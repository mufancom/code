import {plugins as jsPlugins, rules as jsRules} from './@js';

const plugins = [...jsPlugins, '@mufan/eslint-plugin', '@typescript-eslint'];

if (require.main) {
  if (
    /[\\/]\.vscode(?:-server)?[\\/]extensions[\\/]/.test(require.main.filename)
  ) {
    plugins.push('only-warn');
  }
}

export default {
  parser: '@typescript-eslint/parser',
  plugins,
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@mufan/empty-line-around-blocks': 'error',
    '@mufan/import-groups': [
      'error',
      {
        groups: [
          {
            name: 'node-core',
            test: '$node-core',
          },
          {
            name: 'node-modules',
            test: '$node-modules',
            sideEffect: true,
          },
          {
            name: 'node-modules',
            test: '$node-modules',
          },
          {
            name: 'project-base',
            test: '^[@\\w]',
            sideEffect: true,
          },
          {
            name: 'project-base',
            test: '^[@\\w]',
          },
          {
            name: 'upper-directory',
            test: '^\\.\\./',
            sideEffect: true,
          },
          {
            name: 'upper-directory',
            test: '^\\.\\./',
          },
          {
            name: 'current-directory',
            test: '^\\./',
            sideEffect: true,
          },
          {
            name: 'current-directory',
            test: '^\\./',
          },
        ],
        ordered: true,
      },
    ],
    '@mufan/import-path-be-smart': 'error',
    '@mufan/import-path-no-parent': 'error',
    '@mufan/import-path-shallowest': 'error',
    '@mufan/import-path-strict-hierarchy': 'off',
    '@mufan/no-empty-constructor': 'error',
    '@mufan/no-object-literal-type-assertion': 'error',
    '@mufan/ordered-imports': [
      'error',
      {
        'import-sources-order': 'case-insensitive',
        'named-imports-order': 'lowercase-last',
        'module-source-path': 'full',
      },
    ],
    '@mufan/reference-missing-proof': [
      'error',
      {
        extensions: ['.ts', '.tsx', '.d.ts', '.js', '.jsx', '.svg'],
        conditions: ['require', 'import'],
        mainFields: ['main', 'module'],
      },
    ],
    '@mufan/scoped-modules': 'error',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-for-in-array': 'error',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-unused-expressions': 'error',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/prefer-for-of': 'error',
    '@typescript-eslint/semi': 'off',
    '@typescript-eslint/type-annotation-spacing': 'off',
    ...jsRules,
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        'no-unused-expressions': 'off',
        'no-unused-labels': 'off',
        'no-unused-vars': 'off',
        '@mufan/explicit-return-type': 'error',
        '@mufan/import-path-base-url': 'off',
        '@mufan/import-type-unification': 'error',
        '@mufan/strict-key-order': 'error',
        '@typescript-eslint/adjacent-overload-signatures': 'error',
        '@typescript-eslint/array-type': [
          'error',
          {
            default: 'array',
            readonly: 'array',
          },
        ],
        '@typescript-eslint/await-thenable': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/ban-types': [
          'error',
          {
            types: {
              '{}': false,
              object: false,
              Function: false,
              Object: {
                message:
                  'Avoid using the `Object` type. Did you mean `object`?',
              },
              Boolean: {
                message:
                  'Avoid using the `Boolean` type. Did you mean `boolean`?',
              },
              Number: {
                message:
                  'Avoid using the `Number` type. Did you mean `number`?',
              },
              String: {
                message:
                  'Avoid using the `String` type. Did you mean `string`?',
              },
            },
          },
        ],
        '@typescript-eslint/brace-style': 'off',
        '@typescript-eslint/consistent-type-assertions': 'error',
        '@typescript-eslint/consistent-type-definitions': [
          'error',
          'interface',
        ],
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {prefer: 'type-imports'},
        ],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-member-accessibility': [
          'error',
          {
            accessibility: 'no-public',
          },
        ],
        '@typescript-eslint/func-call-spacing': 'off',
        '@typescript-eslint/indent': 'off',
        '@typescript-eslint/index': 'off',
        '@typescript-eslint/member-delimiter-style': 'off',
        '@typescript-eslint/member-ordering': [
          'error',
          {
            default: [
              'public-constructor',
              'protected-constructor',
              'private-constructor',
              'public-instance-method',
              'protected-instance-method',
              'private-instance-method',
              'static-field',
              'public-static-method',
              'protected-static-method',
              'private-static-method',
            ],
          },
        ],
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/no-array-constructor': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-extra-parens': 'off',
        '@typescript-eslint/no-extraneous-class': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',
        '@typescript-eslint/no-misused-new': 'error',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/no-this-alias': 'off',
        '@typescript-eslint/no-type-alias': 'off',
        '@typescript-eslint/no-unnecessary-condition': 'off',
        '@typescript-eslint/no-unnecessary-qualifier': 'error',
        '@typescript-eslint/no-unnecessary-type-arguments': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            varsIgnorePattern: '^_',
            argsIgnorePattern: '^_',
          },
        ],
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/no-useless-constructor': 'off',
        '@typescript-eslint/prefer-function-type': 'error',
        '@typescript-eslint/prefer-includes': 'off',
        '@typescript-eslint/prefer-namespace-keyword': 'error',
        '@typescript-eslint/prefer-readonly': 'off',
        '@typescript-eslint/prefer-regexp-exec': 'off',
        '@typescript-eslint/prefer-string-starts-ends-with': 'off',
        '@typescript-eslint/promise-function-async': 'off',
        '@typescript-eslint/quotes': 'off',
        '@typescript-eslint/require-array-sort-compare': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/restrict-plus-operands': 'off',
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/triple-slash-reference': 'off',
        '@typescript-eslint/typedef': 'off',
        '@typescript-eslint/unbound-method': 'off',
        '@typescript-eslint/unified-signatures': 'error',
        'no-redeclare': 'off',
      },
    },
  ],
};
