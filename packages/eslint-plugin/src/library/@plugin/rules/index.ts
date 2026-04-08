// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as TSESLintUtils from '@typescript-eslint/utils';

import importRule from './@import.js';
import scopedModulesRule from './@scoped-modules.js';

export const rules = {
  'scoped-modules': scopedModulesRule,
  import: importRule,
};
