import * as FS from 'fs';
import * as Path from 'path';

import {TSESTree} from '@typescript-eslint/utils';
import {CachedInputFileSystem, ResolverFactory} from 'enhanced-resolve';
import {isNodeBuiltIn} from 'module-lens';
import * as Typescript from 'typescript';

import {createRule, getParserServices} from './@utils';

const messages = {
  referenceMissing:
    'The package "{{packageName}}" is missing in "references" of config "{{tsconfigPath}}".',
  cannotResolve: 'This module specifier cannot be resolved.',
};

type Options = [
  {
    extensions?: string[] | undefined;
    conditions?: string[] | undefined;
    mainFields?: string[] | undefined;
  },
];

type MessageId = keyof typeof messages;

export const referenceMissingProofRule = createRule<Options, MessageId>({
  name: 'reference-missing-proof',
  meta: {
    docs: {
      description:
        'Check if the order of object keys matches the order of the type',
      recommended: 'error',
    },
    messages,
    schema: [
      {
        type: 'object',
        properties: {
          extensions: {type: 'array', items: {type: 'string'}},
          conditions: {type: 'array', items: {type: 'string'}},
          mainFields: {type: 'array', items: {type: 'string'}},
        },
      },
    ],
    type: 'problem',
  },
  defaultOptions: [{}],

  create(context, [options]) {
    let parserServices = getParserServices(context);

    let rmpResolver = ResolverFactory.createResolver({
      extensions: options?.extensions || [
        '.ts',
        '.tsx',
        '.d.ts',
        '.js',
        '.jsx',
      ],
      conditionNames: options?.conditions || ['import'],
      modules: ['node_modules'],
      mainFields: options?.mainFields || ['main'],
      fileSystem: new CachedInputFileSystem(FS, 4000),
      useSyncFileSystemCalls: true,
    });

    return {
      ImportDeclaration: (node: TSESTree.ImportDeclaration) => {
        let moduleSpecifierNode = node.source;

        check(moduleSpecifierNode);
      },
      TSImportEqualsDeclaration: (node: TSESTree.TSImportEqualsDeclaration) => {
        if (node.moduleReference.type !== 'TSExternalModuleReference') {
          return;
        }

        let moduleSpecifierNode = node.moduleReference.expression;

        check(moduleSpecifierNode);
      },
      ImportExpression: (node: TSESTree.ImportExpression) => {
        let moduleSpecifierNode = node.source;

        check(moduleSpecifierNode);
      },
    };

    function check(moduleSpecifierNode: TSESTree.Expression): void {
      if (moduleSpecifierNode.type !== 'Literal') {
        return;
      }

      let moduleSpecifier = moduleSpecifierNode.value?.toString();

      if (!moduleSpecifier) {
        return;
      }

      if (isNodeBuiltIn(moduleSpecifier)) {
        return;
      }

      try {
        let packagePath = rmpResolver.resolveSync(
          {},
          Path.dirname(context.getFilename()),
          moduleSpecifier,
        );

        if (packagePath === false) {
          throw new Error('Unexpected value of package path.');
        }

        if (packagePath.includes('node_modules')) {
          return;
        }

        let packageTSconfigPath = Typescript.findConfigFile(
          Path.dirname(packagePath),
          Typescript.sys.fileExists,
        );

        if (!packageTSconfigPath) {
          return;
        }

        if (
          context.getFilename().startsWith(Path.dirname(packageTSconfigPath))
        ) {
          return;
        }

        let projectReferences = parserServices.program.getProjectReferences();

        let isInReferences = projectReferences?.some(reference =>
          (packagePath as string).startsWith(reference.path),
        );

        if (!isInReferences) {
          context.report({
            node: moduleSpecifierNode,
            messageId: 'referenceMissing',
            data: {
              packageName: moduleSpecifier,
              tsconfigPath: Typescript.findConfigFile(
                Path.dirname(context.getFilename()),
                Typescript.sys.fileExists,
              ),
            },
          });
        }
      } catch (e) {
        context.report({
          node: moduleSpecifierNode,
          messageId: 'cannotResolve',
        });
      }
    }
  },
});
