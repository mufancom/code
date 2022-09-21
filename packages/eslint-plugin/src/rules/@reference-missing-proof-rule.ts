import * as FS from 'fs';
import * as Path from 'path';

import type {TSESTree} from '@typescript-eslint/utils';
import {CachedInputFileSystem, ResolverFactory} from 'enhanced-resolve';
import * as JSON5 from 'json5';
import _ from 'lodash';
import {isNodeBuiltIn} from 'module-lens';
import TypeScript from 'typescript';

import {createRule, getParserServices} from './@utils';

const messages = {
  referenceMissing:
    'The project "{{projectName}}" is missing in "references" of config "{{tsconfigPath}}".',
  cannotResolve: 'The module specifier {{moduleSpecifier}} cannot be resolved.',
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
    const parserServices = getParserServices(context);

    const projectReferences = parserServices.program.getProjectReferences();
    const outDirs = _.compact(
      projectReferences?.map(projectReference => {
        const projectTSconfigPath = TypeScript.findConfigFile(
          FS.realpathSync.native(projectReference.path),
          TypeScript.sys.fileExists,
        );

        if (!projectTSconfigPath) {
          return undefined;
        }

        let outDir: string | null;

        try {
          outDir = JSON5.parse(FS.readFileSync(projectTSconfigPath).toString())
            ?.compilerOptions?.outDir;
        } catch (e) {
          console.error(
            `JSON parse failed, tsconfig path: ${projectTSconfigPath}`,
          );

          return;
        }

        return (
          outDir && Path.resolve(Path.dirname(projectTSconfigPath), outDir)
        );
      }),
    );

    const rmpResolver = ResolverFactory.createResolver({
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
        const moduleSpecifierNode = node.source;

        check(moduleSpecifierNode);
      },
      TSImportEqualsDeclaration: (node: TSESTree.TSImportEqualsDeclaration) => {
        if (node.moduleReference.type !== 'TSExternalModuleReference') {
          return;
        }

        const moduleSpecifierNode = node.moduleReference.expression;

        check(moduleSpecifierNode);
      },
      ImportExpression: (node: TSESTree.ImportExpression) => {
        const moduleSpecifierNode = node.source;

        check(moduleSpecifierNode);
      },
    };

    function check(moduleSpecifierNode: TSESTree.Expression): void {
      if (moduleSpecifierNode.type !== 'Literal') {
        return;
      }

      const moduleSpecifier = moduleSpecifierNode.value?.toString();

      if (!moduleSpecifier) {
        return;
      }

      if (isNodeBuiltIn(moduleSpecifier)) {
        return;
      }

      try {
        const projectPath = rmpResolver.resolveSync(
          {},
          Path.dirname(context.getFilename()),
          moduleSpecifier,
        );

        if (projectPath === false) {
          throw new Error('Unexpected value of package path.');
        }

        if (
          projectPath.includes('node_modules') ||
          !pathStartsWith(projectPath, process.cwd())
        ) {
          return;
        }

        const tsconfigPath = TypeScript.findConfigFile(
          Path.dirname(context.getFilename()),
          TypeScript.sys.fileExists,
        );

        if (!tsconfigPath) {
          return;
        }

        if (pathStartsWith(projectPath, Path.dirname(tsconfigPath))) {
          return;
        }

        const isInReferences =
          projectReferences?.some(reference =>
            pathStartsWith(
              projectPath as string,
              FS.realpathSync.native(reference.path),
            ),
          ) ||
          outDirs.some(outDir => pathStartsWith(projectPath as string, outDir));

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
          data: {
            moduleSpecifier,
          },
        });
      }
    }
  },
});

function pathStartsWith(path: string, dirPath: string): boolean {
  return !Path.relative(dirPath, path).startsWith('..');
}
