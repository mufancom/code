import * as FS from 'fs';
import * as Path from 'path';

import {TSESTree} from '@typescript-eslint/utils';
import {CachedInputFileSystem, ResolverFactory} from 'enhanced-resolve';
import * as _ from 'lodash';
import {isNodeBuiltIn} from 'module-lens';
import * as Typescript from 'typescript';

import {createRule, getParserServices} from './@utils';

const messages = {
  referenceMissing:
    'The project "{{projectName}}" is missing in "references" of config "{{tsconfigPath}}".',
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

    let projectReferences = parserServices.program.getProjectReferences();
    let outDirs = _.compact(
      projectReferences?.map(projectReference => {
        let projectTSconfigPath = Typescript.findConfigFile(
          projectReference.path,
          Typescript.sys.fileExists,
        );

        if (!projectTSconfigPath) {
          return undefined;
        }

        let outDir = JSON.parse(FS.readFileSync(projectTSconfigPath).toString())
          ?.compilerOptions?.outDir;

        return (
          outDir && Path.resolve(Path.dirname(projectTSconfigPath), outDir)
        );
      }),
    );

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
        let projectPath = rmpResolver.resolveSync(
          {},
          Path.dirname(context.getFilename()),
          moduleSpecifier,
        );

        if (projectPath === false) {
          throw new Error('Unexpected value of package path.');
        }

        if (projectPath.includes('node_modules')) {
          return;
        }

        let tsconfigPath = Typescript.findConfigFile(
          Path.dirname(context.getFilename()),
          Typescript.sys.fileExists,
        );

        if (!tsconfigPath) {
          return;
        }

        if (projectPath.startsWith(Path.dirname(tsconfigPath))) {
          return;
        }

        let isInReferences =
          projectReferences?.some(reference =>
            (projectPath as string).startsWith(
              FS.realpathSync.native(reference.path),
            ),
          ) ||
          outDirs.some(outDir => (projectPath as string).startsWith(outDir));

        if (!isInReferences) {
          context.report({
            node: moduleSpecifierNode,
            messageId: 'referenceMissing',
            data: {
              projectName: moduleSpecifier,
              tsconfigPath,
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
