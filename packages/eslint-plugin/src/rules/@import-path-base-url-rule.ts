import type {TSESTree} from '@typescript-eslint/utils';

import {
  ImportKind,
  ModuleSpecifierHelper,
  createRule,
  findImports,
  getFirstSegmentOfPath,
  getModuleSpecifier,
  isRelativeModuleSpecifier,
} from './@utils';

const messages = {
  importMustUseBaseURL: 'This import path must use baseUrl.',
  importMustBeRelativePath: 'This import path must be a relative path.',
};

type Options = [
  {
    baseUrl?: string;
    tsConfigSearchName?: string;
  },
];

type MessageId = keyof typeof messages;

export const importPathBaseUrlRule = createRule<Options, MessageId>({
  name: 'import-path-base-url',
  meta: {
    docs: {
      description: 'Check import module from baseUrl',
      recommended: 'error',
    },
    messages,
    schema: [
      {
        type: 'object',
        properties: {
          baseUrl: {
            type: 'string',
            default: '.',
          },
          tsConfigSearchName: {
            type: 'string',
            default: 'tsconfig.json',
          },
        },
      },
    ],
    type: 'problem',
    fixable: 'code',
  },
  defaultOptions: [
    {
      baseUrl: '.',
      tsConfigSearchName: 'tsconfig.json',
    },
  ],

  create(context, [options]) {
    const moduleSpecifierHelper = new ModuleSpecifierHelper(
      context.getFilename(),
      options,
    );

    function validateModuleSpecifier(
      expression: TSESTree.Literal | TSESTree.TemplateLiteral,
    ): void {
      const sourceFileName = context.getFilename();

      const helper = moduleSpecifierHelper;

      if (!helper.isPathWithinBaseUrlDir(sourceFileName)) {
        return;
      }

      const specifier = getModuleSpecifier(context.getSourceCode(), expression);

      const fullSpecifierPath = helper.resolve(specifier);

      if (
        !fullSpecifierPath ||
        !helper.isPathWithinBaseUrlDir(fullSpecifierPath)
      ) {
        return;
      }

      const relative = isRelativeModuleSpecifier(specifier);

      const relativeSourcePath =
        helper.getRelativePathToBaseUrlDir(sourceFileName);

      const firstSegmentOfRelativeSourcePath =
        getFirstSegmentOfPath(relativeSourcePath);

      const relativeSpecifierPath =
        helper.getRelativePathToBaseUrlDir(fullSpecifierPath);

      const firstSegmentOfSpecifierPath = getFirstSegmentOfPath(
        relativeSpecifierPath,
      );

      if (firstSegmentOfRelativeSourcePath === firstSegmentOfSpecifierPath) {
        if (!relative) {
          const relativeSpecifier = `'${helper.build(fullSpecifierPath, false)}'`;

          context.report({
            node: expression,
            messageId: 'importMustBeRelativePath',
            fix: fixer => {
              return fixer.replaceTextRange(
                expression.range,
                relativeSpecifier,
              );
            },
          });
        }
      } else {
        if (relative) {
          const baseUrlSpecifier = `'${helper.build(fullSpecifierPath, true)}'`;

          context.report({
            node: expression,
            messageId: 'importMustUseBaseURL',
            fix: fixer => {
              return fixer.replaceTextRange(expression.range, baseUrlSpecifier);
            },
          });
        }
      }
    }

    const imports = findImports(context, ImportKind.AllStaticImports);

    for (const expression of imports) {
      validateModuleSpecifier(expression);
    }

    return {};
  },
});
