import * as Path from 'path';

import type {
  ESLintUtils,
  JSONSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TSESLint,
  TSESTree,
} from '@typescript-eslint/utils';
import {format, resolveWithCategory} from 'module-lens';
import * as x from 'x-value';

import {
  MODULE_EXTENSIONS,
  gentleStat,
  getModuleSpecifier,
  isSubPathOf,
  removeModuleFileExtension,
} from './@utils/index.js';

const messages = {
  canNotImportDirectoryModules:
    'Can not import this module that have index file in the directory where this module is located.',
};

type MessageId = keyof typeof messages;

const Options = x.tuple([x.object({})]);

type Options = x.TypeOf<typeof Options>;

export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: Options.toJSONSchema() as JSONSchema.JSONSchema4,
    messages,
  },
  defaultOptions: [{}],
  create(context) {
    const sourceFileName = context.getFilename();

    return {
      ImportDeclaration(node) {
        validate(node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          validate(node.source);
        }
      },
      ExportAllDeclaration(node) {
        validate(node.source);
      },
    };

    function validate(expression: TSESTree.LiteralExpression): void {
      const specifier = getModuleSpecifier(context.getSourceCode(), expression);

      const {category, path: specifierPath} = resolveWithCategory(specifier, {
        sourceFileName,
      });

      if (
        !specifierPath ||
        category === 'built-in' ||
        category === 'node-modules'
      ) {
        return;
      }

      let expectedSpecifierPath = guessModulePath(specifierPath);

      let currentPath = expectedSpecifierPath;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        currentPath = Path.dirname(currentPath);

        if (
          // Avoid importing from its own parent directory.
          // source: a/b.js
          // import: ../c.js -> a/c.js
          // parent 1: a -> isSubPathOf(a/b.js, a) -> true
          isSubPathOf(sourceFileName, currentPath)
        ) {
          break;
        }

        if (!hasIndexFile(currentPath)) {
          break;
        }

        expectedSpecifierPath = Path.join(currentPath, 'index.js');
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
  },
} satisfies ESLintUtils.RuleWithMeta<Options, MessageId>;

function guessModulePath(specifierPath: string): string {
  const stats = gentleStat(specifierPath);

  if (stats && stats.isDirectory()) {
    return Path.posix.join(specifierPath, 'index.js');
  }

  const specifierPathWithoutExtension =
    removeModuleFileExtension(specifierPath);

  return `${specifierPathWithoutExtension}.js`;
}

function hasIndexFile(dir: string): boolean {
  for (const extension of MODULE_EXTENSIONS) {
    const stats = gentleStat(Path.join(dir, `index${extension}`));

    if (stats && stats.isFile()) {
      return true;
    }
  }

  return false;
}
