import * as Path from 'path';

import type {TSESTree} from '@typescript-eslint/utils';
import {format} from 'module-lens';

import {
  ImportKind,
  createRule,
  findImports,
  getModuleSpecifier,
  isSubPathOf,
} from './@utils';

const messages = {
  nonstandardImportPath: 'The import path could be smarter.',
};

type Options = [];

type MessageId = keyof typeof messages;

export const importPathBeSmartRule = createRule<Options, MessageId>({
  name: 'import-path-be-smart',
  meta: {
    docs: {
      description:
        'Check to if import path is a shortest path and provide fixer.',
      recommended: 'error',
    },
    messages,
    schema: [],
    type: 'suggestion',
    fixable: 'code',
  },
  defaultOptions: [],

  create(context) {
    class ImportPathBeSmartWalker {
      walk(): void {
        const sourceDirName = Path.dirname(context.getFilename());

        const imports = findImports(context, ImportKind.AllImports);

        for (const expression of imports) {
          this.validateModuleSpecifier(expression, sourceDirName);
        }
      }

      private validateModuleSpecifier(
        expression: TSESTree.LiteralExpression,
        sourceDirName: string,
      ): void {
        const specifier = getModuleSpecifier(
          context.getSourceCode(),
          expression,
        );

        const dotSlash = specifier.startsWith('./');

        // foo/bar/../abc -> foo/abc
        let normalizedSpecifier = format(
          Path.posix.normalize(specifier),
          dotSlash,
        );

        const [refSpecifier, firstNonUpperSegment] = /^(?:\.\.\/)+([^/]+)/.exec(
          specifier,
        ) || [undefined, undefined];

        if (refSpecifier) {
          if (firstNonUpperSegment === 'node_modules') {
            normalizedSpecifier = specifier
              .slice(refSpecifier.length + 1)
              .replace(/^@types\//, '');
          }

          const refPath = Path.join(sourceDirName, refSpecifier);

          // importing '../foo/bar' ('abc/foo/bar') within source file
          // 'abc/foo/test.ts', which could simply be importing './bar'.

          if (isSubPathOf(sourceDirName, refPath, true)) {
            const path = Path.join(sourceDirName, specifier);
            const relativePath = Path.relative(sourceDirName, path);
            normalizedSpecifier = format(relativePath, true);
          }
        }

        if (normalizedSpecifier === specifier) {
          return;
        }

        context.report({
          node: expression,
          messageId: 'nonstandardImportPath',
          fix: fixer => {
            return fixer.replaceTextRange(
              expression.range,
              `'${normalizedSpecifier}'`,
            );
          },
        });
      }
    }

    new ImportPathBeSmartWalker().walk();

    return {};
  },
});
