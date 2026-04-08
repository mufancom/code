import type {Linter} from 'eslint';

export const dev: Linter.Config[] = [
  {
    name: '@mufan/dev',
    rules: {
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
        },
      ],
    },
  },
];
