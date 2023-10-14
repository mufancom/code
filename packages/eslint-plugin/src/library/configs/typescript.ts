import {Linter} from 'eslint';

export const typescript: Linter.Config = {
  extends: [
    'plugin:@mufan/javascript',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': {
      typescript: true,
    },
  },
};
