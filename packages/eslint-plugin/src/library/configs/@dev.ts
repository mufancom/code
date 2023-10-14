import type {Linter} from 'eslint';

export default {
  rules: {
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
      },
    ],
  },
} satisfies Linter.Config;
