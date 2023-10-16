// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as TSESLintUtils from '@typescript-eslint/utils';

import ImportShallowest from './@import-shallowest.js';
import scopedModulesRule from './@scoped-modules.js';

export const rules = {
  'scoped-modules': scopedModulesRule,
  'import-shallowest': ImportShallowest,
};
