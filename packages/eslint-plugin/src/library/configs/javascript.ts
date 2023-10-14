import {Linter} from 'eslint';

export const javascript: Linter.Config = {
  extends: ['eslint:recommended', 'plugin:import/recommended'],
};
