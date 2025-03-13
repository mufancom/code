const NO_UNUSED_VARS_IGNORE_PATTERN = '^_(?!_|$)';

export const NO_UNUSED_VARS_OPTIONS = {
  varsIgnorePattern: NO_UNUSED_VARS_IGNORE_PATTERN,
  argsIgnorePattern: NO_UNUSED_VARS_IGNORE_PATTERN,
};

export const VSCODE = require.main
  ? /[\\/]\.[^\\/]+[\\/]extensions[\\/]/.test(require.main.filename)
  : false;
