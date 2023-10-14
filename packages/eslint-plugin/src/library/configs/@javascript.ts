import type {Linter} from 'eslint';

export default {
  extends: ['eslint:recommended', 'plugin:import/recommended'],
  plugins: ['@mufan'],
  rules: {
    '@mufan/scoped-modules': 'error',
    'import/no-cycle': 'error',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: false,
        optionalDependencies: false,
      },
    ],
    'import/no-relative-packages': 'error',
    'import/no-self-import': 'error',
    'import/no-useless-path-segments': 'error',
    'import/order': [
      'error',
      {
        alphabetize: {
          order: 'asc',
          orderImportKind: 'asc',
        },
        'newlines-between': 'always',
      },
    ],
    'no-unused-vars': ['error', {varsIgnorePattern: '^_(?!_)'}],
  },
} satisfies Linter.Config;
