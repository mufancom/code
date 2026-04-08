import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

export const MODULE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

export function getModuleSpecifier(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Expression,
): string {
  return eval(sourceCode.getText(node));
}

export function hasKnownModuleFileExtension(fileName: string): boolean {
  return /(?!\.d\.ts$)\.[jt]sx?$/.test(fileName);
}

export function removeModuleFileExtension(fileName: string): string {
  return fileName.replace(/\.(?:[jt]sx?|d\.ts)$/i, '');
}
