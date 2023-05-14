import * as Path from 'path';

import type {TSESTree} from '@typescript-eslint/utils';

import {
  ImportKind,
  ModuleSpecifierHelper,
  createRule,
  findImports,
  getFirstSegmentOfPath,
  getModuleSpecifier,
  removeModuleFileExtension,
} from './@utils';

const messages = {
  bannedHierarchyImport:
    'Importing the target module from this file is not allowed',
};

type Options = [
  {
    baseUrl: string;
    hierarchy: object;
  },
];

type MessageId = keyof typeof messages;

export const importPathStrictHierarchyRule = createRule<Options, MessageId>({
  name: 'import-path-strict-hierarchy',
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
          },
          tsConfigSearchName: {
            type: 'string',
          },
          hierarchy: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
      },
    ],
    type: 'suggestion',
  },
  defaultOptions: [
    {
      baseUrl: '.',
      hierarchy: {},
    },
  ],

  create(context, [options]) {
    const parsedOptions = options || [];

    class ImportPathStrictHierarchyWalker {
      private moduleSpecifierHelper = new ModuleSpecifierHelper(
        context.getFilename(),
        parsedOptions,
      );

      walk(): void {
        const {hierarchy} = parsedOptions;

        const sourceNameToShallowlyAllowedNameSetMap = new Map<
          string,
          Set<string>
        >();

        for (const [sourceName, allowedNames] of Object.entries(hierarchy)) {
          sourceNameToShallowlyAllowedNameSetMap.set(
            sourceName,
            new Set(allowedNames),
          );
        }

        const imports = findImports(context, ImportKind.AllImports);

        for (const expression of imports) {
          this.validateModuleSpecifier(
            expression,
            sourceNameToShallowlyAllowedNameSetMap,
          );
        }
      }

      private validateModuleSpecifier(
        expression: TSESTree.LiteralExpression,
        sourceNameToAllowedNameSetMap: Map<string, Set<string>>,
      ): void {
        const helper = this.moduleSpecifierHelper;

        const specifier = getModuleSpecifier(
          context.getSourceCode(),
          expression,
        );
        const {path: specifierPath, category} =
          helper.resolveWithCategory(specifier);

        if (
          !specifierPath ||
          (category !== 'relative' && category !== 'base-url')
        ) {
          return;
        }

        const projectDirName = helper.baseUrlDirName || helper.projectDirName;
        const sourceFileName = helper.sourceFileName;

        const specifierPathRelativeToProjectDir = Path.relative(
          projectDirName,
          specifierPath,
        );
        const sourceFileNameRelativeToProjectDir = Path.relative(
          projectDirName,
          sourceFileName,
        );

        const relativeSpecifierPathFirstSegment = getFirstSegmentOfPath(
          specifierPathRelativeToProjectDir,
        );
        const relativeSourceFileNameFirstSegment =
          sourceFileNameRelativeToProjectDir.includes(Path.sep)
            ? getFirstSegmentOfPath(sourceFileNameRelativeToProjectDir)
            : removeModuleFileExtension(sourceFileNameRelativeToProjectDir);

        if (
          relativeSpecifierPathFirstSegment === '..' ||
          relativeSourceFileNameFirstSegment === '..' ||
          relativeSpecifierPathFirstSegment ===
            relativeSourceFileNameFirstSegment
        ) {
          return;
        }

        const allowedSet = sourceNameToAllowedNameSetMap.get(
          relativeSourceFileNameFirstSegment,
        );

        if (allowedSet && !allowedSet.has(relativeSpecifierPathFirstSegment)) {
          context.report({
            node: expression.parent!,
            messageId: 'bannedHierarchyImport',
          });
        }
      }
    }

    new ImportPathStrictHierarchyWalker().walk();

    return {};
  },
});
