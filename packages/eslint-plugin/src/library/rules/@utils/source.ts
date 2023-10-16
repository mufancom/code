import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

export function getSourceCodeFullStart(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
): number {
  const token = sourceCode.getTokenBefore(node);

  return token === null ? 0 : token.range[1];
}
