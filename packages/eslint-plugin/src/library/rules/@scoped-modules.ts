import * as FS from 'fs';
import * as Path from 'path';

import type {
  TSESLint,
  TSESTree,
  JSONSchema,
  ESLintUtils,
} from '@typescript-eslint/utils';
import {AST_NODE_TYPES} from '@typescript-eslint/utils';
import * as x from 'x-value';

import {
  difference,
  getBaseNameWithoutExtension,
  getModuleSpecifier,
  getSourceCodeFullStart,
  hasKnownModuleFileExtension,
  removeModuleFileExtension,
} from './@utils.js';

const INDEX_FILE_REGEX = /(?:^|[\\/])index\.(?:js|jsx|ts|tsx|d\.ts)$/i;
const NAMESPACE_FILE_REGEX = /(?:^|[\\/])namespace\.(?:js|jsx|ts|tsx|d\.ts)$/i;

const BANNED_IMPORT_REGEX = /^(?!(?:\.{1,2}[\\/])+@(?!.*[\\/]@)).*[\\/]@/;
const BANNED_EXPORT_REGEX = /[\\/]@/;
const BANNED_EXPORT_REGEX_FOR_AT_PREFIXED = /^\.[\\/]@(?:.*?)[\\/]@/;

const messages = {
  bannedImport:
    'This module can not be imported, because it contains internal module with prefix `@` under a parallel directory.',
  bannedExport:
    'This module can not be exported, because it contains internal module with prefix `@` under a parallel directory.',
  missingExports: 'Missing modules expected to be exported.',
  missingImports: 'Missing modules expected to be imported.',
  bannedImportWhenNamespaceExists:
    'This module can not be imported since namespace file exists',
  bannedExportWhenNamespaceExists:
    'This module can not be exported since namespace file exists',
};

const Options = x.tuple([x.object({})]);

type Options = x.TypeOf<typeof Options>;

export default {
  meta: {
    type: 'problem',
    fixable: 'code',
    schema: Options.toJSONSchema() as JSONSchema.JSONSchema4,
    messages,
  },
  defaultOptions: [{}],
  create(context) {
    type ModuleStatement =
      | TSESTree.ImportDeclaration
      | TSESTree.ExportNamedDeclaration
      | TSESTree.ExportAllDeclaration;

    type ModuleStatementInfo =
      | ImportStatementInfo
      | ExportStatementInfo
      | ExportAsStatementInfo;

    type ModuleStatementType = ModuleStatementInfo['type'];

    interface ImportStatementInfo {
      type: 'import';
      statement: ModuleStatement;
      specifier: string;
    }

    interface ExportStatementInfo {
      type: 'export';
      statement: ModuleStatement;
      specifier: string;
    }

    interface ExportAsStatementInfo {
      type: 'export-as';
      statement: ModuleStatement;
      specifier: string;
    }

    function validateImportOrExport({
      type,
      statement,
      specifier,
    }: ModuleStatementInfo): void {
      let bannedPattern: RegExp;
      let messageId: 'bannedImport' | 'bannedExport';

      if (type === 'import') {
        bannedPattern = BANNED_IMPORT_REGEX;
        messageId = 'bannedImport';
      } else {
        bannedPattern = BANNED_EXPORT_REGEX;
        messageId = 'bannedExport';

        const fileName = context.filename;

        const baseName = getBaseNameWithoutExtension(fileName);

        if (baseName.startsWith('@')) {
          bannedPattern = BANNED_EXPORT_REGEX_FOR_AT_PREFIXED;
        }
      }

      if (bannedPattern.test(specifier)) {
        context.report({
          node: statement,
          messageId,
          fix:
            type === 'export'
              ? fixer => {
                  const tokenAfter =
                    context.sourceCode.getTokenAfter(statement);

                  return fixer.replaceTextRange(
                    [
                      statement.range[0],
                      tokenAfter === null
                        ? context.sourceCode.getText().length
                        : tokenAfter.range[0],
                    ],
                    '',
                  );
                }
              : undefined,
        });
      }
    }

    function validateIndexFile(infos: ModuleStatementInfo[]): void {
      const fileName = context.filename;
      const dirName = Path.dirname(fileName);
      let fileNames: string[];

      try {
        fileNames = FS.readdirSync(dirName);
      } catch (error) {
        console.error(
          `Index validation aborted due to failure of reading: ${dirName}`,
        );
        return;
      }

      const hasNamespaceFile =
        fileNames.filter(fileName => NAMESPACE_FILE_REGEX.test(fileName))
          .length >= 1;

      if (hasNamespaceFile) {
        for (const info of infos) {
          const {type, specifier, statement} = info;

          /**
           *  When there's a namespace file in the directory, we should just
           *  export the namespace. The code below will report an error when you
           *  write 'export * from xxx' or when you import a module which is not
           *  the namespace file.
           */
          if (
            type === 'export' ||
            ((type === 'import' || type === 'export-as') &&
              specifier !== './namespace.js')
          ) {
            context.report({
              node: statement,
              messageId:
                type === 'import'
                  ? 'bannedImportWhenNamespaceExists'
                  : 'bannedExportWhenNamespaceExists',
              fix: fixer => {
                return fixer.replaceTextRange(
                  [
                    getSourceCodeFullStart(context.sourceCode, statement),
                    statement.range[1],
                  ],
                  '',
                );
              },
            });
          }
        }

        const importSpecifiers = infos
          .filter(info => info.type === 'import' || info.type === 'export-as')
          .map(info => info.specifier);

        const expectedImportSpecifiers = ['./namespace.js'];

        const missingImportIds = difference(
          expectedImportSpecifiers,
          importSpecifiers,
        );

        if (missingImportIds.length) {
          context.report({
            node: context.sourceCode.ast,
            messageId: 'missingImports',
            fix: fixer => {
              return fixer.replaceTextRange(
                context.sourceCode.ast.range,
                `${[
                  context.sourceCode.getText().trimEnd(),
                  `export * as Namespace from './namespace.js';`,
                ]
                  .filter(text => !!text)
                  .join('\n')}\n`,
              );
            },
          });
        }
      } else {
        validateFile(dirName, fileNames);
      }
    }

    function validateNamespaceFile(): void {
      const fileName = context.filename;
      const dirName = Path.dirname(fileName);
      let fileNames;

      try {
        fileNames = FS.readdirSync(dirName);
      } catch (error) {
        console.error(
          `Index validation aborted due to failure of reading: ${dirName}`,
        );
        return;
      }

      validateFile(dirName, fileNames);
    }

    function validateFile(dirName: string, fileNames: string[]): void {
      const exportSpecifiers = infos
        .filter(info => info.type === 'export')
        .map(info => info.specifier);

      const expectedExportSpecifiers = fileNames
        .map((fileName): string | undefined => {
          if (fileName.startsWith('.')) {
            return undefined;
          }

          const entryFullPath = Path.join(dirName, fileName);
          let stats;

          try {
            stats = FS.statSync(entryFullPath);
          } catch (error) {
            return undefined;
          }

          let specifier: string;

          if (stats.isFile()) {
            if (
              INDEX_FILE_REGEX.test(fileName) ||
              NAMESPACE_FILE_REGEX.test(fileName) ||
              !hasKnownModuleFileExtension(fileName)
            ) {
              return undefined;
            }

            specifier = `./${removeModuleFileExtension(fileName)}.js`;
          } else if (stats.isDirectory()) {
            let entryNamesInFolder;

            try {
              entryNamesInFolder = FS.readdirSync(entryFullPath);
            } catch (error) {
              return undefined;
            }

            const hasIndexFile = entryNamesInFolder.some(entryNameInFolder =>
              INDEX_FILE_REGEX.test(entryNameInFolder),
            );

            if (!hasIndexFile) {
              return undefined;
            }

            specifier = `./${fileName}/index.js`;
          } else {
            return undefined;
          }

          if (BANNED_EXPORT_REGEX.test(specifier)) {
            return undefined;
          }

          return specifier;
        })
        .filter((entryName): entryName is string => !!entryName);

      const missingExportSpecifiers = difference(
        expectedExportSpecifiers,
        exportSpecifiers,
      );

      if (missingExportSpecifiers.length) {
        context.report({
          node: context.sourceCode.ast,
          messageId: 'missingExports',
          fix: buildAddMissingExportsFixer(missingExportSpecifiers),
        });
      }
    }

    function buildAddMissingExportsFixer(
      specifiers: string[],
    ): TSESLint.ReportFixFunction {
      return fixer =>
        fixer.replaceTextRange(
          [0, context.sourceCode.getText().length],
          `${[
            context.getSourceCode().getText().trimEnd(),
            ...specifiers.map(value => `export * from '${value}';`),
          ]
            .filter(text => !!text)
            .join('\n')}\n`,
        );
    }

    function isStringLiteral(node: TSESTree.Node): node is TSESTree.Literal {
      return (
        (node.type === AST_NODE_TYPES.Literal &&
          typeof node.value === 'string') ||
        node.type === AST_NODE_TYPES.TemplateLiteral
      );
    }

    const infos: ModuleStatementInfo[] = [];

    for (const statement of context.sourceCode.ast.body) {
      let type: ModuleStatementType;

      switch (statement.type) {
        case AST_NODE_TYPES.ImportDeclaration:
          type = 'import';
          break;

        case AST_NODE_TYPES.ExportNamedDeclaration:
          type = 'export';
          break;

        case AST_NODE_TYPES.ExportAllDeclaration:
          type = statement.exported ? 'export-as' : 'export';
          break;

        default:
          continue;
      }

      const specifier =
        statement.source && isStringLiteral(statement.source)
          ? getModuleSpecifier(context.sourceCode, statement.source)
          : undefined;

      if (!specifier) {
        continue;
      }

      infos.push({
        type,
        statement,
        specifier,
      } as ModuleStatementInfo);
    }

    const fileName = context.filename;

    if (INDEX_FILE_REGEX.test(fileName)) {
      validateIndexFile(infos);
    } else {
      for (const info of infos) {
        validateImportOrExport(info);
      }

      if (NAMESPACE_FILE_REGEX.test(fileName)) {
        validateNamespaceFile();
      }
    }

    return {};
  },
} satisfies ESLintUtils.RuleWithMeta<Options, keyof typeof messages>;
