import {createRequire} from 'module';

const moduleRequire = createRequire(import.meta.url);

export const VSCODE = moduleRequire.main
  ? /[\\/]\.[^\\/]+[\\/]extensions[\\/]/.test(moduleRequire.main.filename)
  : false;

if (VSCODE) {
  moduleRequire('eslint-plugin-only-warn');
}
