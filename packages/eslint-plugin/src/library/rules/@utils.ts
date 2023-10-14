import {basename, extname} from 'path';

import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

export function difference<T>(a: T[], b: T[]): T[] {
  const excludeSet = new Set(b);

  return a.filter(x => !excludeSet.has(x));
}

export function getBaseNameWithoutExtension(fileName: string): string {
  return basename(fileName, extname(fileName));
}

export function getSourceCodeFullStart(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
): number {
  const token = sourceCode.getTokenBefore(node);

  return token === null ? 0 : token.range[1];
}

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
