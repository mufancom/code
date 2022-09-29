import * as Path from 'path';

import type {TSESTree} from '@typescript-eslint/utils';
import {format} from 'module-lens';

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

type Options = [{}];

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
    fixable: 'code',
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
        const specifier = getModuleSpecifier(
          context.getSourceCode(),
          expression,
        );

        const {category, path: specifierPath} =
          helper.resolveWithCategory(specifier);

        const sourceFileName = context.getFilename();

        if (
          !specifierPath ||
          category === 'built-in' ||
          category === 'node-modules'
        ) {
          return;
        }

        let expectedSpecifierPath = specifierPath;

        if (isIndexFile(expectedSpecifierPath)) {
          expectedSpecifierPath = Path.dirname(expectedSpecifierPath);
        }

        while (true) {
          const parentDirName = Path.dirname(expectedSpecifierPath);

          if (
            isSubPathOf(sourceFileName, parentDirName) ||
            !hasIndexFile(parentDirName)
          ) {
            break;
          }

          expectedSpecifierPath = parentDirName;
        }

        if (expectedSpecifierPath === specifierPath) {
          return;
        }

        const expectedSpecifier = format(
          Path.posix.normalize(
            Path.relative(Path.dirname(sourceFileName), expectedSpecifierPath),
          ),
          true,
        );

        context.report({
          node: expression.parent!,
          messageId: 'canNotImportDirectoryModules',
          fix: fixer => fixer.replaceText(expression, `'${expectedSpecifier}'`),
        });
      }
    }

    function isIndexFile(path: string): boolean {
      const fileName = Path.basename(path);

      return (
        fileName === 'index' ||
        MODULE_EXTENSIONS.some(extension => fileName === `index${extension}`)
      );
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
