import {TSESTree} from '@typescript-eslint/experimental-utils';
import _ from 'lodash';
import {resolveWithCategory} from 'module-lens';

import {RequiredParserServices, createRule} from './@utils';

/*
  TODO

  1. Improve readability of importTypeNotUnifiedPreviously
  2. Use different message id to distinction quick config naming type issue
*/

type ImportType = 'default' | 'namespace' | 'named' | 'equals';

const IMPORT_TYPES = ['default', 'namespace', 'named', 'equals'];

interface ImportInfo {
  importType: ImportType;
  localIdentifier: TSESTree.Identifier;
  /**
   * Available on named import
   */
  importedIdentifier: TSESTree.Identifier | undefined;
}

interface ImportIdentifyInfo {
  importType: ImportType;
  identifier: TSESTree.Identifier;
  filename: string;
}

interface ReportInfo {
  importIdentifyInfos: ImportIdentifyInfo[] | undefined;
  reportedImportTypeSet?: Set<ImportType>;
  reported: boolean;
}

/**
 * Example:
 *
 * <
 *   "fs": ReportInfo,
 *   "/code/src/node_modules/react": ReportInfo,
 *   "/code/src/core": ReportInfo
 * >
 */
let modulePathToReportInfoMap: Map<string, ReportInfo> = new Map();

const messages = {
  importTypeNotUnified: 'Import style should be unified.',
  importTypeNotUnifiedPreviously:
    'At {{line}}:{{column}},\tin file "{{filename}}", identifier "{{identifier}}": Import style should be unified.',
  // importTypeNotAllowed: 'This import type is not allowed.',
  // identifierNotTheSame:
  //   'The identifier of the import declaration with this import type and module specifier {{moduleSpecifier}} should be the same',
  // identifierNotAllowed:
  //   'This identifier is not allowed in this import declaration with this import type and module specifier {{moduleSpecifier}}',
};

interface AllowConfigurationObject {
  type: ImportType;
  identifiers: '*' | 'identical' | string[];
}

type QuickConfigImportNamingType = 'as-is' | 'as-is-with-underscore' | 'any';
const QUICK_CONFIG_IMPORT_NAMING_TYPE = [
  'as-is',
  'as-is-with-underscore',
  'any',
];

interface QuickConfigOptions {
  /**
   * Module name or path to apply config
   */
  modules: string[];
  /**
   * Allow default and named import appear at same time
   */
  allowDefaultAndNamedImport: boolean;
  /**
   * Naming type of default import, example:
   * A module named 'foobar', then:
   *
   * as-is: foobar and FooBar or fooBar was allowed
   *
   * as-is-with-underscore: all name in 'as-is' plus '_foobar'
   *
   * any: no limitation at all
   */
  defaultImportNamingType?: QuickConfigImportNamingType;
  /**
   * Naming type of named import
   *
   * Same as default import naming type, but the name will be compare with it's
   * origin export name rather than module name
   */
  namedImportNamingType?: QuickConfigImportNamingType;
}

type Options = [
  {
    quickConfigs?: QuickConfigOptions[];
    configs?: {
      module: string;
      allow: (ImportType | AllowConfigurationObject)[];
    }[];
  },
];

type MessageId = keyof typeof messages;

export const importTypeUnificationRule = createRule<Options, MessageId>({
  name: 'import-type-unification-rule',
  meta: {
    docs: {
      description: 'Unify the style of imports.',
      category: 'Stylistic Issues',
      recommended: 'error',
    },
    messages,
    schema: [
      {
        type: 'object',
        properties: {
          quickConfigs: {
            type: 'array',
            items: {
              type: 'object',
              required: ['modules', 'allowDefaultAndNamedImport'],
              properties: {
                modules: {
                  type: 'array',
                },
                allowDefaultAndNamedImport: {
                  type: 'boolean',
                },
                defaultImportNamingType: {
                  type: 'string',
                  enum: QUICK_CONFIG_IMPORT_NAMING_TYPE,
                },
                namedImportNamingType: {
                  type: 'string',
                  enum: QUICK_CONFIG_IMPORT_NAMING_TYPE,
                },
              },
            },
          },
          configs: {
            type: 'array',
            items: {
              type: 'object',
              required: ['module', 'allow'],
              properties: {
                module: {
                  type: 'string',
                },
                allow: {
                  type: 'array',
                  items: {
                    oneOf: [
                      {
                        type: 'string',
                        enum: IMPORT_TYPES,
                      },
                      {
                        type: 'object',
                        required: ['type', 'identifiers'],
                        properties: {
                          type: {
                            type: 'string',
                            enum: IMPORT_TYPES,
                          },
                          identifiers: {
                            oneOf: [
                              {
                                type: 'string',
                                enum: ['*', 'identical'],
                              },
                              {
                                type: 'array',
                                items: {
                                  type: 'string',
                                },
                              },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    ],
    type: 'suggestion',
  },
  defaultOptions: [{}],

  create(context, [options]) {
    interface TypeUnificationAdditionalOptions {
      baseUrlDirName?: string;
    }

    /**
     * Find imports in ESTree and return it with self defined import type
     */
    function resolveEveryImportTypeAndIdentifier(
      declaration:
        | TSESTree.ImportDeclaration
        | TSESTree.TSImportEqualsDeclaration
        | TSESTree.ExportAllDeclaration,
    ): ImportInfo[] {
      if (declaration.type === 'ImportDeclaration') {
        return declaration.specifiers.map(specifier => {
          let localIdentifier = specifier.local;

          switch (specifier.type) {
            case 'ImportDefaultSpecifier':
              return {
                importType: 'default',
                localIdentifier,
                importedIdentifier: undefined,
              };

            case 'ImportNamespaceSpecifier':
              return {
                importType: 'namespace',
                localIdentifier,
                importedIdentifier: undefined,
              };

            case 'ImportSpecifier':
              return {
                importType: 'named',
                localIdentifier,
                importedIdentifier: specifier.imported,
              };

            default:
              throw new Error('Unexpected specifier type.');
          }
        });
      } else if (declaration.type === 'TSImportEqualsDeclaration') {
        return [
          {
            importType: 'equals',
            localIdentifier: declaration.id,
            importedIdentifier: undefined,
          },
        ];
      } else {
        throw new Error('Unexpected Import Declaration Type');
      }
    }

    function reportErrors(importInfos: ImportInfo[]): void {
      for (let {localIdentifier: identifier} of importInfos) {
        context.report({
          node: identifier,
          messageId: 'importTypeNotUnified', // TODO (ooyyloo): distinguish error message type 'identifierNotTheSame'
        });
      }
    }

    function reportPreviousError(
      identifier: TSESTree.Identifier,
      data: Record<string, unknown>,
    ): void {
      if (data.filename === context.getFilename()) {
        context.report({
          node: identifier,
          messageId: 'importTypeNotUnified',
        });
      } else {
        context.report({
          node: identifier,
          messageId: 'importTypeNotUnifiedPreviously',
          data,
        });
      }
    }

    function reportPreviousErrors(
      importTypes: ImportType[],
      groups: _.Dictionary<ImportInfo[]>,
      previouslyImportInfos: ImportIdentifyInfo[],
    ): void {
      for (let info of previouslyImportInfos) {
        const data = {
          filename: info.filename,
          identifier: info.identifier.name,
          line: info.identifier.loc.start.line,
          column: info.identifier.loc.start.column,
        };

        if (importTypes.length === 1) {
          if (info.importType !== importTypes[0]) {
            reportPreviousError(info.identifier, data);
          } else {
            for (let {localIdentifier: identifier} of groups[info.importType]) {
              if (identifier.name !== info.identifier.name) {
                reportPreviousError(info.identifier, data);

                break;
              }
            }
          }
        } else {
          for (let importType of importTypes) {
            if (info.importType !== importType) {
              reportPreviousError(info.identifier, data);

              break;
            }
          }
        }
      }
    }

    /** check if groups plus reportNeededInfos satisfy the unification constraint */
    function checkUnity(
      groups: _.Dictionary<ImportInfo[]>,
      previouslyImportInfos: ImportIdentifyInfo[] | undefined,
      additionalInfos: {importTypes: ImportType[]},
    ): boolean {
      let importTypes =
        additionalInfos.importTypes || (Object.keys(groups) as ImportType[]);

      if (
        // There are multiple import type, not allowed by default
        importTypes.length > 1 ||
        // TODO (ooyyloo): Is this case exist in real world?
        (importTypes[0] !== 'named' && groups[importTypes[0]].length > 1)
      ) {
        return false;
      }

      if (!previouslyImportInfos) {
        return true;
      }

      let identifierName = groups[importTypes[0]][0].localIdentifier.name;

      for (let info of previouslyImportInfos) {
        if (info.importType !== importTypes[0]) {
          return false;
        }

        if (info.importType !== 'named') {
          if (info.identifier.name !== identifierName) {
            return false;
          }
        }
      }

      return true;
    }

    /**
     * Ensure imports with same type have same name across all file
     */
    function handleNameIdenticalImport(
      path: string,
      importType: ImportType,
      importIdentifier: TSESTree.Identifier,
    ): void {
      let reportInfo = modulePathToReportInfoMap.get(path);

      if (!reportInfo) {
        modulePathToReportInfoMap.set(path, {
          reported: false,
          importIdentifyInfos: [
            {
              filename: context.getFilename(),
              importType,
              identifier: importIdentifier,
            },
          ],
        });

        return;
      }

      if (!reportInfo.reportedImportTypeSet) {
        reportInfo.reportedImportTypeSet = new Set();
      }

      if (!reportInfo.reportedImportTypeSet.has(importType)) {
        for (let previouslyImportInfo of reportInfo.importIdentifyInfos!) {
          // Imports to same module with same type must have same name across
          // several file, can different with module name.
          if (
            importType === previouslyImportInfo.importType &&
            importIdentifier.name !== previouslyImportInfo.identifier.name
          ) {
            context.report({
              node: importIdentifier,
              messageId: 'importTypeNotUnified',
            });

            reportInfo.reportedImportTypeSet.add(importType);

            let newImportIdentifyInfos = [];

            // Report previous founded imports with same type as error, and keep
            // Others for future report
            for (let importIdentifyInfo of reportInfo.importIdentifyInfos!) {
              if (importIdentifyInfo.importType === importType) {
                const data = {
                  filename: importIdentifyInfo.filename,
                  identifier: importIdentifyInfo.identifier.name,
                  line: importIdentifyInfo.identifier.loc.start.line,
                  column: importIdentifyInfo.identifier.loc.start.column,
                };

                reportPreviousError(importIdentifyInfo.identifier, data);
              } else {
                newImportIdentifyInfos.push(importIdentifyInfo);
              }
            }

            reportInfo.importIdentifyInfos = newImportIdentifyInfos;

            return;
          }
        }

        reportInfo.importIdentifyInfos = [
          ...(reportInfo.importIdentifyInfos || []),
          {
            filename: context.getFilename(),
            importType,
            identifier: importIdentifier,
          },
        ];

        return;
      }

      context.report({
        node: importIdentifier,
        messageId: 'importTypeNotUnified',
      });
    }

    /*
     Helper start
    */

    // Check is there a exemption config for this module
    function isConfiguredModule(moduleSpecifier: string): boolean {
      let hasQuickConfig = options.quickConfigs?.some(
        quickConfig => quickConfig.modules.indexOf(moduleSpecifier) >= 0,
      );

      let hasGeneralConfig = options.configs?.some(
        rule => rule.module === moduleSpecifier,
      );

      return Boolean(hasQuickConfig || hasGeneralConfig);
    }

    /**
     * Check is the name of import specifier follow configured naming type
     */
    function isNamingTypeMatch(
      namingType: QuickConfigImportNamingType,
      referenceName: string,
      name: string,
    ): boolean {
      let unifiedReferenceName = referenceName.toLowerCase();
      let unifiedName = name.toLowerCase();

      switch (namingType) {
        case 'as-is':
          return unifiedName === unifiedReferenceName;
        case 'as-is-with-underscore':
          return (
            unifiedName === unifiedReferenceName ||
            unifiedName === `_${unifiedReferenceName}`
          );
        case 'any':
          return true;
      }
    }

    /*
     Helper end
    */

    /*
     Entry point
    */
    function addAndReportUnificationErrors(
      moduleSpecifier: string,
      importInfos: ImportInfo[],
      additionalOptions?: TypeUnificationAdditionalOptions,
    ): void {
      let {path} = resolveWithCategory(moduleSpecifier, {
        sourceFileName: context.getFilename(),
        baseUrlDirName: additionalOptions?.baseUrlDirName,
      });

      if (!path) {
        return;
      }

      let reportInfo = modulePathToReportInfoMap.get(path);

      let importTypeToInfoDict: _.Dictionary<ImportInfo[]> = _.groupBy(
        importInfos,
        'importType',
      );
      let importTypes = Object.keys(importTypeToInfoDict) as ImportType[];

      if (!isConfiguredModule(moduleSpecifier)) {
        // No exemption config for this module

        // This file was previously reported
        if (reportInfo?.reported) {
          return reportErrors(importInfos);
        }

        // This file was added previously in analysis scope
        if (reportInfo) {
          if (
            // There are multiple import type, not allowed by default
            importTypes.length !== 1 ||
            // TODO (ooyyloo): Is this case exist in real world?
            (importTypes[0] !== 'named' &&
              importTypeToInfoDict[importTypes[0]].length !== 1)
          ) {
            reportErrors(importInfos);

            reportInfo.reported = true;

            if (reportInfo.importIdentifyInfos) {
              reportPreviousErrors(
                importTypes,
                importTypeToInfoDict,
                reportInfo.importIdentifyInfos,
              );

              reportInfo.importIdentifyInfos = undefined;
            }
          } else {
            if (
              !checkUnity(
                importTypeToInfoDict,
                reportInfo.importIdentifyInfos,
                {
                  importTypes,
                },
              )
            ) {
              reportErrors(importInfos);

              reportPreviousErrors(
                importTypes,
                importTypeToInfoDict,
                reportInfo.importIdentifyInfos!,
              );

              reportInfo.reported = true;
              reportInfo.importIdentifyInfos = undefined;
            } else {
              reportInfo.importIdentifyInfos = (
                reportInfo.importIdentifyInfos || []
              ).concat([
                {
                  filename: context.getFilename(),
                  importType: importTypes[0],
                  identifier: importInfos[0].localIdentifier,
                },
              ]);
            }
          }
        } else {
          if (
            importTypes.length !== 1 ||
            (importTypes[0] !== 'named' &&
              importTypeToInfoDict[importTypes[0]].length !== 1)
          ) {
            reportErrors(importInfos);

            modulePathToReportInfoMap.set(path, {
              reported: true,
              importIdentifyInfos: undefined,
            });
          } else {
            // only one kind of import type and only one identifier

            modulePathToReportInfoMap.set(path, {
              reported: false,
              importIdentifyInfos: [
                {
                  importType: importInfos[0].importType,
                  identifier: importInfos[0].localIdentifier,
                  filename: context.getFilename(),
                },
              ],
            });
          }
        }
      } else {
        // This module specifier is configured

        let quickConfig = options.quickConfigs?.find(config =>
          config.modules.find(name => name === moduleSpecifier),
        );
        let allowedTypeInfos = options.configs?.find(
          exception => exception.module === moduleSpecifier,
        )?.allow;

        if (!quickConfig && !allowedTypeInfos) {
          return;
        }

        for (let importType of importTypes) {
          for (let {
            localIdentifier,
            importedIdentifier,
          } of importTypeToInfoDict[importType]) {
            let allowed = false;

            // Prefer quick config
            if (quickConfig?.allowDefaultAndNamedImport) {
              let {
                defaultImportNamingType,
                namedImportNamingType,
              } = quickConfig;
              switch (importType) {
                case 'default':
                  if (
                    isNamingTypeMatch(
                      defaultImportNamingType ?? 'as-is',
                      moduleSpecifier,
                      localIdentifier.name,
                    )
                  ) {
                    continue;
                  }

                  break;
                case 'named':
                  if (
                    isNamingTypeMatch(
                      namedImportNamingType ?? 'as-is',
                      // Always exist in named import
                      importedIdentifier!.name,
                      localIdentifier.name,
                    )
                  ) {
                    continue;
                  }

                  break;
              }
            }

            // If no quick config or disabled, fallback to general config
            if (allowedTypeInfos) {
              for (let allowedTypeInfo of allowedTypeInfos) {
                if (typeof allowedTypeInfo === 'string') {
                  if (allowedTypeInfo !== importType) {
                    continue;
                  }

                  // Bypass type mismatch error report and hand it over to name
                  // identical check
                  allowed = true;

                  handleNameIdenticalImport(path, importType, localIdentifier);
                } else if (allowedTypeInfo.type === importType) {
                  if (typeof allowedTypeInfo.identifiers === 'string') {
                    if (allowedTypeInfo.identifiers === '*') {
                      allowed = true;
                    } else if (allowedTypeInfo.identifiers === 'identical') {
                      // Same here, bypass
                      allowed = true;

                      handleNameIdenticalImport(
                        path,
                        importType,
                        localIdentifier,
                      );
                    } else {
                      throw new Error(
                        `Wrong Configuration: identifiers: ${allowedTypeInfo.identifiers}`,
                      );
                    }
                  } else if (Array.isArray(allowedTypeInfo.identifiers)) {
                    if (
                      allowedTypeInfo.identifiers.includes(localIdentifier.name)
                    ) {
                      allowed = true;
                    } else {
                      // Nothing. Error will be reported below.
                    }
                  } else {
                    throw new Error(
                      `Wrong Configuration: identifiers: ${allowedTypeInfo.identifiers}`,
                    );
                  }

                  break;
                }
              }
            }

            if (!allowed) {
              context.report({
                node: localIdentifier,
                messageId: 'importTypeNotUnified',
              });
            }
          }
        }
      }
    }

    if (
      context.parserServices &&
      context.parserServices.program &&
      context.parserServices.esTreeNodeToTSNodeMap
    ) {
      let parserServices = context.parserServices as RequiredParserServices;
      let baseUrlDirName = parserServices.program.getCompilerOptions().baseUrl;

      return {
        ImportDeclaration: declaration => {
          let moduleSpecifier = declaration.source.value as string | null; // TODO (ooyyloo): When it will be null?

          if (declaration.source.type !== 'Literal' || !moduleSpecifier) {
            return;
          }

          let importInfos = resolveEveryImportTypeAndIdentifier(declaration);

          addAndReportUnificationErrors(moduleSpecifier, importInfos, {
            baseUrlDirName,
          });
        },
        TSImportEqualsDeclaration: declaration => {
          let moduleReference = declaration.moduleReference;

          if (
            moduleReference.type !== 'TSExternalModuleReference' ||
            moduleReference.expression.type !== 'Literal'
          ) {
            return;
          }

          let moduleSpecifier = moduleReference.expression.value as
            | string
            | null; // TODO (ooyyloo): When it will be null?

          if (!moduleSpecifier) {
            return;
          }

          let importInfos: ImportInfo[] = [
            {
              importType: 'equals',
              localIdentifier: declaration.id,
              importedIdentifier: undefined,
            },
          ];

          addAndReportUnificationErrors(moduleSpecifier, importInfos, {
            baseUrlDirName,
          });
        },
      };
    } else {
      return {
        ImportDeclaration: declaration => {
          let moduleSpecifier = declaration.source.value as string | null; // TODO (ooyyloo): When it will be null?

          if (declaration.source.type !== 'Literal' || !moduleSpecifier) {
            return;
          }

          let importInfos = resolveEveryImportTypeAndIdentifier(declaration);

          addAndReportUnificationErrors(moduleSpecifier, importInfos);
        },
      };
    }
  },
});
