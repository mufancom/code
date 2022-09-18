import * as Path from 'path';

import type {TSESTree} from '@typescript-eslint/utils';

import {
  ImportKind,
  MODULE_EXTENSIONS,
  ModuleSpecifierHelper,
  createRule,
  findImports,
  gentleStat,
  getModuleSpecifier,
  isSubPathOf,
} from './@utils';

const messages = {
  canNotImportDirectoryModules:
    'Can not import this module that have index file in the directory where this module is located.',
};

type Options = [
  {
    baseUrl?: string;
    tsConfigSearchName?: string;
  },
];

type MessageId = keyof typeof messages;

export const importPathShallowestRule = createRule<Options, MessageId>({
  name: 'import-path-shallowest',
  meta: {
    docs: {
      description:
        'Validate import expression of path that directory module path whether module under the path or not',
      recommended: 'error',
    },
    messages,
    schema: [
      {
        type: 'object',
        properties: {
          baseUrl: {
            type: 'string',
          },
          tsConfigSearchName: {
            type: 'string',
          },
        },
      },
    ],
    type: 'suggestion',
  },
  defaultOptions: [{}],

  create(context, [options]) {
    class ImportPathShallowestWalker {
      private moduleSpecifierHelper = new ModuleSpecifierHelper(
        context.getFilename(),
        options,
      );

      walk(): void {
        const imports = findImports(context, ImportKind.AllImports);

        for (const expression of imports) {
          this.validate(expression);
        }
      }

      private validate(expression: TSESTree.LiteralExpression): void {
        const helper = this.moduleSpecifierHelper;
        const specifier = getModuleSpecifier(context.getSourceCode(), expression);

        const {category, path} = helper.resolveWithCategory(specifier);

        const sourceFileName = context.getFilename();

        if (
          !path ||
          category === 'built-in' ||
          category === 'node-modules' ||
          // '../..', '../../foo'
          isSubPathOf(sourceFileName, Path.dirname(path)) ||
          // './foo'
          Path.relative(path, Path.dirname(sourceFileName)) === ''
        ) {
          return;
        }

        const parentDirName = Path.dirname(path);

        if (!hasIndexFile(parentDirName)) {
          return;
        }

        context.report({
          node: expression.parent!,
          messageId: 'canNotImportDirectoryModules',
        });
      }
    }

    function hasIndexFile(dirName: string): boolean {
      const possibleIndexPaths = MODULE_EXTENSIONS.map(extension =>
        Path.join(dirName, `index${extension}`),
      );

      return possibleIndexPaths.some(path => {
        const stats = gentleStat(path);
        return !!stats && stats.isFile();
      });
    }

    new ImportPathShallowestWalker().walk();

    return {};
  },
});
