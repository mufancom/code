import FS from 'fs';
import Path from 'path';

import {AST_NODE_TYPES, TSESTree} from '@typescript-eslint/experimental-utils';
import {
  RuleMetaData,
  RuleMetaDataDocs,
  RuleFunction,
} from '@typescript-eslint/experimental-utils/dist/ts-eslint/Rule';
import {SourceCode} from 'eslint';
import _ from 'lodash';
import {resolveWithCategory} from 'module-lens';
import {Field, MapField, Message, Type} from 'protobufjs';
import {Dict} from 'tslang';

import {RequiredParserServices, createRule, gentleStat} from './@utils';

/*
  TODO

  1. Improve readability of importTypeNotUnifiedPreviously
  2. Use different message id to distinction quick config naming type issue
*/

type CreateRuleMeta<TMessageIds extends string> = {
  docs: Omit<RuleMetaDataDocs, 'url'>;
} & Omit<RuleMetaData<TMessageIds>, 'docs'>;

type ConcernedDeclaration =
  | TSESTree.ImportDeclaration
  | TSESTree.TSImportEqualsDeclaration
  | TSESTree.ExportAllDeclaration
  | TSESTree.ExportNamedDeclaration;

type ImportType =
  | 'default'
  | 'namespace'
  | 'named'
  | 'equals'
  | 'export-all'
  | 'export-named'
  | 'export-namespace';

const IMPORT_TYPES = [
  'default',
  'namespace',
  'named',
  'named-as',
  'equals',
  'export-all',
  'export-named',
  'export-named-as',
  'export-namespace',
];

interface TypeUnificationAdditionalOptions {
  baseUrlDirName?: string;
}

interface DefaultImportInfo {
  importType: 'default';
  localIdentifier: TSESTree.Identifier;
}

interface NamespaceImportInfo {
  importType: 'namespace';
  localIdentifier: TSESTree.Identifier;
}

interface NamedImportInfo {
  importType: 'named';
  localIdentifier: TSESTree.Identifier;
  importedIdentifier: TSESTree.Identifier;
}

interface EqualsImportInfo {
  importType: 'equals';
  localIdentifier: TSESTree.Identifier;
}

interface ExportAllImportInfo {
  importType: 'export-all';
  declaration: TSESTree.ExportAllDeclaration;
}

interface ExportNamedImportInfo {
  importType: 'export-named';
  localIdentifier: TSESTree.Identifier;
  importedIdentifier: TSESTree.Identifier;
}

interface ExportNamespaceImportInfo {
  importType: 'export-namespace';
  localIdentifier: TSESTree.Identifier;
}

type ImportInfo = (
  | DefaultImportInfo
  | NamespaceImportInfo
  | NamedImportInfo
  | EqualsImportInfo
  | ExportAllImportInfo
  | ExportNamedImportInfo
  | ExportNamespaceImportInfo
) & {
  declaration: ConcernedDeclaration;
};

@Type.d('LineAndColumnData')
class LineAndColumnData extends Message<LineAndColumnData> {
  @Field.d(1, 'int32')
  line!: number;

  @Field.d(2, 'int32')
  column!: number;
}

@Type.d('SourceLocation')
class SourceLocation extends Message<SourceLocation> {
  @Field.d(1, LineAndColumnData)
  start!: LineAndColumnData;

  @Field.d(2, LineAndColumnData)
  end!: LineAndColumnData;
}

@Type.d('Identifier')
class Identifier extends Message<Identifier> {
  @Field.d(1, 'string')
  type!: AST_NODE_TYPES.Identifier;

  @Field.d(2, 'string')
  name!: string;

  @Field.d(3, 'int32', 'repeated')
  range!: [number, number];

  @Field.d(4, SourceLocation)
  loc!: SourceLocation;
}

@Type.d('Declaration')
class Declaration extends Message<Declaration> {
  @Field.d(1, 'int32', 'repeated')
  range!: [number, number];

  @Field.d(2, SourceLocation)
  loc!: SourceLocation;
}

@Type.d('ImportIdentifyInfo')
class ImportIdentifyInfo extends Message<ImportIdentifyInfo> {
  @Field.d(1, 'bool')
  reported!: boolean;

  @Field.d(2, 'string')
  importType!: ImportType;

  @Field.d(3, 'string')
  filePath!: string;

  @Field.d(4, Identifier, 'optional')
  identifier?: Identifier | undefined;

  @Field.d(5, Identifier, 'optional')
  importedIdentifier?: Identifier | undefined;

  @Field.d(6, Declaration)
  declaration!: Declaration;
}

@Type.d('ReportInfo')
class ReportInfo extends Message<ReportInfo> {
  @Field.d(1, ImportIdentifyInfo, 'repeated')
  importIdentifyInfos!: ImportIdentifyInfo[]; // TODO (ooyyloo): remove "!"

  @Field.d(2, 'string')
  moduleSpecifier!: string;
}

// 相对于项目目录的路径, win32格式
@Type.d('ModulePaths')
class ModulePaths extends Message<ModulePaths> {
  @Field.d(1, 'string', 'repeated')
  modulePaths!: string[];
}

@Type.d('Cache')
class Cache extends Message<Cache> {
  @MapField.d(1, 'string', ReportInfo)
  modulePathToReportInfoDict!: Dict<ReportInfo>;

  @MapField.d(2, 'string', ModulePaths)
  filePathToModulePaths!: Dict<ModulePaths>; // filePath为相对于项目目录的路径, win32格式
}

const messages = {
  importTypeNotUnified:
    'Import style should be unified. Conflict with identifier "{{identifier}}" in file "{{filePath}}" at line:{{line}},column:{{column}}',
  importTypeNotUnifiedForExportAll: `Import style should be unified. Module specifier "{{moduleSpecifier}}" of a declaration conflicts with another declaration in file "{{filePath}}" at line:{{line}},column:{{column}}`,
  notUnderQuickConfig:
    'Import style should be unified. Identifier "{{identifier}}" not under quick config rule "{{importNamingType}}"',
  notMatchConfiguration: `Import style should be unified. Identifier "{{identifier}}" of module specifier "{{moduleSpecifier}}" does not match rule config`,
  notMatchConfigurationForExportAll: `Import style should be unified. Module specifier "{{moduleSpecifier}}" of a export all declaration does not match rule config`,
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
   * Naming type of default import, example:
   * A module named 'foobar', then:
   *
   * as-is: foobar and FooBar or fooBar was allowed
   *
   * as-is-with-underscore: all name in 'as-is' plus '_'. Example: '_foobar'
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

interface ConfigOption {
  module: string;
  allow: (ImportType | AllowConfigurationObject)[];
}

type Options = [
  {
    cacheDir: string;
    quickConfigs?: QuickConfigOptions[];
    configs?: ConfigOption[];
  },
];

type MessageId = keyof typeof messages;

const ruleBody = {
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
        required: ['cacheDir'],
        properties: {
          cacheDir: {
            type: 'string',
          },
          quickConfigs: {
            type: 'array',
            items: {
              type: 'object',
              required: ['modules'],
              properties: {
                modules: {
                  type: 'array',
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
  } as CreateRuleMeta<MessageId>,
};

export const importTypeUnificationRule = createRule<Options, MessageId>({
  ...ruleBody,
  defaultOptions: [{cacheDir: '.'}],
  create(context, [options]) {
    let projectPath = process.cwd();
    let filePath = Path.win32.relative(projectPath, context.getFilename());

    let modulePathToReportInfoDict: Dict<ReportInfo> = {};
    let filePathToModulePaths: Dict<ModulePaths> = {};

    let cachePath = Path.win32.resolve(
      projectPath,
      options.cacheDir,
      'cache.protobuf',
    );

    let cachePathStats = gentleStat(cachePath);

    if (cachePathStats?.isFile()) {
      let cacheFilebuffer = FS.readFileSync(cachePath);

      let cache = Cache.decode(cacheFilebuffer);

      modulePathToReportInfoDict = cache.modulePathToReportInfoDict;
      filePathToModulePaths = cache.filePathToModulePaths;
    } else if (cachePathStats?.isDirectory()) {
      throw new Error('Intended cache path is occupied by a directory');
    } else {
      FS.mkdirSync(options.cacheDir, {recursive: true});
    }

    let newModulePaths = [];

    for (let modulePath of filePathToModulePaths[filePath]?.modulePaths || []) {
      let reportInfo = modulePathToReportInfoDict[modulePath];

      if (reportInfo?.importIdentifyInfos) {
        _.remove(reportInfo.importIdentifyInfos, {filePath});
      }

      if (reportInfo.importIdentifyInfos.length !== 0) {
        newModulePaths.push(modulePath);
      }
    }

    if (filePathToModulePaths[filePath]) {
      if (newModulePaths.length === 0) {
        delete filePathToModulePaths[filePath];
      } else {
        filePathToModulePaths[filePath] = new ModulePaths({
          modulePaths: newModulePaths,
        });
      }
    }

    if (
      context.parserServices &&
      context.parserServices.program &&
      context.parserServices.esTreeNodeToTSNodeMap
    ) {
      let parserServices = context.parserServices as RequiredParserServices;
      let baseUrlDirName = parserServices.program.getCompilerOptions().baseUrl;

      walkNode(
        context.getSourceCode().ast,
        context.getSourceCode().visitorKeys,
        (node: TSESTree.Node) => {
          switch (node.type) {
            case 'ImportDeclaration': {
              visitImportDeclaration(baseUrlDirName)(node);

              break;
            }

            case 'TSImportEqualsDeclaration': {
              let moduleReference = node.moduleReference;

              if (
                moduleReference.type !== 'TSExternalModuleReference' ||
                moduleReference.expression.type !== 'Literal'
              ) {
                return;
              }

              let moduleSpecifier = moduleReference.expression.value as
                | string
                | null;

              if (!moduleSpecifier) {
                return;
              }

              let importInfos = resolveEveryImportTypeAndIdentifier(node);

              addReportInfoAndReportErrors(moduleSpecifier, importInfos, {
                baseUrlDirName,
              });

              break;
            }

            // case 'ExportNamedDeclaration':
            case 'ExportAllDeclaration': {
              visitExportDeclaration(baseUrlDirName)(node);

              break;
            }
          }
        },
      );
    } else {
      walkNode(
        context.getSourceCode().ast,
        context.getSourceCode().visitorKeys,
        (node: TSESTree.Node) => {
          switch (node.type) {
            case 'ImportDeclaration': {
              visitImportDeclaration()(node);

              break;
            }

            // case 'ExportNamedDeclaration':
            case 'ExportAllDeclaration': {
              visitExportDeclaration()(node);

              break;
            }
          }
        },
      );
    }

    let message = new Cache({
      modulePathToReportInfoDict,
      filePathToModulePaths,
    });
    let encodeBytes = Cache.encode(message).finish();

    FS.writeFileSync(cachePath, encodeBytes);

    return {};

    function walkNode(
      rootNode: TSESTree.Node,
      visitorKeys: SourceCode.VisitorKeys,
      callback: (node: TSESTree.Node) => void,
    ): void {
      let queue: TSESTree.Node[] = [];

      queue.push(rootNode);

      while (queue.length > 0) {
        let node = queue.shift()!;

        callback(node);

        let visitorKeysOfSpecificType = visitorKeys[node.type];

        if (!visitorKeysOfSpecificType) {
          continue;
        }

        for (let visitorKey of visitorKeysOfSpecificType) {
          let children = node[visitorKey as keyof TSESTree.Node] as
            | TSESTree.Node
            | TSESTree.Node[]
            | undefined;

          if (!children) {
            continue;
          } else if (Array.isArray(children)) {
            for (let child of children) {
              if (child) {
                queue.push(child);
              }
            }
          } else {
            if (children) {
              queue.push(children);
            }
          }
        }
      }
    }

    /**
     * Find imports in ESTree and return it with self defined import type
     */
    function resolveEveryImportTypeAndIdentifier(
      declaration: ConcernedDeclaration,
    ): ImportInfo[] {
      if (
        declaration.type === 'ImportDeclaration' ||
        (declaration.type === 'ExportNamedDeclaration' &&
          !!(declaration.source as TSESTree.Literal)?.value)
      ) {
        return _.compact(
          declaration.specifiers.map(specifier => {
            let localIdentifier = specifier.local;

            switch (specifier.type) {
              case 'ImportDefaultSpecifier':
                return {
                  importType: 'default',
                  localIdentifier,
                  importedIdentifier: undefined,
                  declaration,
                };

              case 'ImportNamespaceSpecifier':
                return {
                  importType: 'namespace',
                  localIdentifier,
                  importedIdentifier: undefined,
                  declaration,
                };

              case 'ImportSpecifier':
                return {
                  importType: 'named',
                  localIdentifier,
                  importedIdentifier: specifier.imported,
                  declaration,
                };

              case 'ExportSpecifier':
                return {
                  importType: 'export-named',
                  localIdentifier,
                  importedIdentifier: specifier.exported,
                  declaration,
                };

              default:
                throw new Error('Unexpected specifier type.');
            }
          }),
        );
      } else if (declaration.type === 'TSImportEqualsDeclaration') {
        return [
          {
            importType: 'equals',
            localIdentifier: declaration.id,
            declaration,
          },
        ];
      } else if (declaration.type === 'ExportAllDeclaration') {
        if (declaration.exported) {
          return [
            {
              importType: 'export-namespace',
              localIdentifier: declaration.exported,
              declaration,
            },
          ];
        } else {
          return [
            {
              importType: 'export-all',
              declaration,
            },
          ];
        }
      } else {
        throw new Error('Unexpected Import Declaration Type');
      }
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
        default:
          throw new Error('Unexpected Naming Type');
      }
    }

    function newIdentifier(TSESIdentifier: TSESTree.Identifier): Identifier {
      return new Identifier({
        type: AST_NODE_TYPES.Identifier,
        name: TSESIdentifier.name,
        range: TSESIdentifier.range,
        loc: new SourceLocation({
          start: new LineAndColumnData(TSESIdentifier.loc.start),
          end: new LineAndColumnData(TSESIdentifier.loc.end),
        }),
      });
    }

    function checkDefaultUnity(importTypes: string[]): boolean {
      if (importTypes.length > 1) {
        return false;
      }

      return true;
    }

    function handleNameIdenticalImport(
      importTypeToImportIdentifyInfosDict: Dict<ImportIdentifyInfo[]>,
      notReportedImportTypeToImportIdentifyInfosDict: _.Dictionary<
        ImportIdentifyInfo[]
      >,
      importType: string,
      identifier: Identifier,
      reportMessageId: 'importTypeNotUnified' | 'notMatchConfiguration',
      moduleSpecifier: string,
    ): boolean {
      let importIdentifyInfos = importTypeToImportIdentifyInfosDict[importType];

      if (importIdentifyInfos.length === 1) {
        return false;
      }

      let importIdentifyInfo = importIdentifyInfos.find(
        importIdentifyInfo =>
          importIdentifyInfo.identifier!.name !== identifier.name,
      )!;
      let anotherIdentifier = importIdentifyInfo.identifier!;

      context.report({
        node: identifier,
        messageId: reportMessageId,
        data: {
          identifier: anotherIdentifier.name,
          filePath: importIdentifyInfo.filePath,
          line: anotherIdentifier.loc.start.line,
          column: anotherIdentifier.loc.start.column,
          moduleSpecifier,
        },
      });

      let notReportedImportTypeToImportIdentifyInfos =
        notReportedImportTypeToImportIdentifyInfosDict[importType];

      if (notReportedImportTypeToImportIdentifyInfos) {
        for (let info of notReportedImportTypeToImportIdentifyInfos) {
          info.reported = true;

          if (info.filePath === filePath) {
            context.report({
              node: info.identifier!,
              messageId: reportMessageId,
              data: {
                identifier: identifier!.name,
                filePath: filePath,
                line: identifier!.loc.start.line,
                column: identifier!.loc.start.column,
                moduleSpecifier,
              },
            });
          } else {
            context.report({
              node: identifier,
              messageId: reportMessageId,
              data: {
                identifier: info.identifier!.name,
                filePath: filePath,
                line: info.identifier!.loc.start.line,
                column: info.identifier!.loc.start.column,
                moduleSpecifier,
              },
            });
          }
        }

        delete notReportedImportTypeToImportIdentifyInfosDict[importType];
      }

      return true;
    }

    function addReportInfoAndReportErrors(
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

      let moduleRelativePath = path;

      if (Path.win32.basename(path) !== path) {
        moduleRelativePath = Path.win32.relative(projectPath, path);
      }

      let reportInfo = modulePathToReportInfoDict[moduleRelativePath];

      if (!reportInfo) {
        reportInfo = modulePathToReportInfoDict[
          moduleRelativePath
        ] = new ReportInfo({
          importIdentifyInfos: [],
          moduleSpecifier: moduleSpecifier,
        });
      }

      let quickConfig = options.quickConfigs?.find(config =>
        config.modules.find(name => name === moduleSpecifier),
      );
      let config = options.configs?.find(
        exception => exception.module === moduleSpecifier,
      );

      let newImportIdentifyInfos = importInfos.map(importInfo => {
        let info = new ImportIdentifyInfo();

        if (filePathToModulePaths[filePath]) {
          filePathToModulePaths[
            filePath
          ].modulePaths = _.union(filePathToModulePaths[filePath].modulePaths, [
            moduleRelativePath,
          ]);
        } else {
          filePathToModulePaths[filePath] = new ModulePaths({
            modulePaths: [moduleRelativePath],
          });
        }

        info.filePath = filePath;
        info.reported = false;
        info.importType = importInfo.importType;
        info.declaration = new Declaration({
          range: importInfo.declaration.range,
          loc: new SourceLocation({
            start: new LineAndColumnData(importInfo.declaration.loc.start),
            end: new LineAndColumnData(importInfo.declaration.loc.end),
          }),
        });

        switch (importInfo.importType) {
          case 'default':
          case 'namespace':
          case 'equals':
          case 'export-namespace': {
            info.identifier = newIdentifier(importInfo.localIdentifier);

            break;
          }

          case 'named':
          case 'export-named': {
            info.identifier = newIdentifier(importInfo.localIdentifier);
            info.importedIdentifier = newIdentifier(
              importInfo.importedIdentifier,
            );

            break;
          }

          case 'export-all': {
            // nothing

            break;
          }
        }

        return info;
      });

      let notReportedImportIdentifyInfos = reportInfo.importIdentifyInfos.filter(
        importIdentifyInfo => !importIdentifyInfo.reported,
      );
      let notReportedGroups = _.groupBy(
        notReportedImportIdentifyInfos,
        'importType',
      );

      reportInfo.importIdentifyInfos = reportInfo.importIdentifyInfos.concat(
        newImportIdentifyInfos.filter(
          info =>
            info.importType !== 'named' && info.importType !== 'export-named', // not save info of 'name' and 'export-named' imports
        ),
      );

      let groups = _.groupBy(reportInfo.importIdentifyInfos, 'importType');
      let importTypeToImportIdentifyInfosDict: Dict<ImportIdentifyInfo[]> = {};
      let importTypes = Object.keys(groups).filter(
        importType => importType !== 'named' && importType !== 'export-named',
      );

      for (let importType of Object.keys(groups)) {
        importTypeToImportIdentifyInfosDict[importType] = _.uniqBy(
          groups[importType],
          importIdentifyInfo => importIdentifyInfo.identifier?.name,
        );
      }

      for (let i = 0; i < newImportIdentifyInfos.length; ++i) {
        let info = newImportIdentifyInfos[i];
        let isConfiguredModule = Boolean(quickConfig || config);
        let allowedTypeInfos = config?.allow;
        let {
          importType,
          identifier: localIdentifier,
          importedIdentifier,
          declaration,
        } = info;

        if (i > 0 && newImportIdentifyInfos[i - 1].reported === false) {
          if (notReportedGroups[importType]) {
            notReportedGroups[importType].push(newImportIdentifyInfos[i - 1]);
          } else {
            notReportedGroups[importType] = [newImportIdentifyInfos[i - 1]];
          }
        }

        if (!isConfiguredModule) {
          // TODO (ooyyloo): add configuration regulation about these two import types
          if (importType === 'named' || importType === 'export-named') {
            continue;
          }

          if (checkDefaultUnity(importTypes)) {
            if (
              importType !== 'export-all' &&
              handleNameIdenticalImport(
                importTypeToImportIdentifyInfosDict,
                notReportedGroups,
                importType,
                localIdentifier!,
                'importTypeNotUnified',
                moduleSpecifier,
              )
            ) {
              info.reported = true;
            }
          } else {
            info.reported = true;

            for (let anotherImportType of importTypes) {
              if (anotherImportType !== importType) {
                let anotherImportIdentifyInfo =
                  importTypeToImportIdentifyInfosDict[anotherImportType][0];

                if (
                  importType === 'export-all' ||
                  anotherImportType === 'export-all'
                ) {
                  context.report({
                    node: (declaration as unknown) as TSESTree.Node,
                    messageId: 'importTypeNotUnifiedForExportAll',
                    data: {
                      moduleSpecifier,
                      filePath: anotherImportIdentifyInfo.filePath,
                      line:
                        anotherImportIdentifyInfo.declaration.loc.start.line,
                      column:
                        anotherImportIdentifyInfo.declaration.loc.start.column,
                    },
                  });
                } else {
                  context.report({
                    node: localIdentifier!,
                    messageId: 'importTypeNotUnified',
                    data: {
                      identifier: anotherImportIdentifyInfo.identifier!.name,
                      filePath: anotherImportIdentifyInfo.filePath,
                      line: anotherImportIdentifyInfo.identifier!.loc.start
                        .line,
                      column: anotherImportIdentifyInfo.identifier!.loc.start
                        .column,
                    },
                  });
                }

                break;
              }
            }

            for (let anotherImportType of importTypes) {
              let notReportedImportTypeToImportIdentifyInfos =
                notReportedGroups[anotherImportType];

              if (notReportedImportTypeToImportIdentifyInfos) {
                for (let anotherInfo of notReportedImportTypeToImportIdentifyInfos) {
                  if (anotherInfo.reported) {
                    continue;
                  }

                  anotherInfo.reported = true;

                  let reportInfo =
                    anotherInfo.filePath === filePath ? info : anotherInfo;

                  if (anotherImportType === 'export-all') {
                    context.report({
                      node: (anotherInfo.filePath === filePath
                        ? anotherInfo.declaration
                        : (declaration as unknown)) as TSESTree.Node,
                      messageId: 'importTypeNotUnifiedForExportAll',
                      data: {
                        filePath: reportInfo.filePath,
                        line: reportInfo.declaration.loc.start.line,
                        column: reportInfo.declaration.loc.start.column,
                        moduleSpecifier,
                      },
                    });
                  } else {
                    context.report({
                      node: (anotherInfo.filePath === filePath
                        ? anotherInfo.identifier
                        : (localIdentifier as unknown)) as TSESTree.Node,
                      messageId: 'importTypeNotUnified',
                      data: {
                        identifier: reportInfo.identifier!.name,
                        filePath: reportInfo.filePath,
                        line: reportInfo.identifier!.loc.start.line,
                        column: reportInfo.identifier!.loc.start.column,
                      },
                    });
                  }
                }

                delete notReportedGroups[importType];
              }
            }
          }
        } else {
          let allowed = false;

          // Prefer quick config
          if (quickConfig) {
            let {defaultImportNamingType, namedImportNamingType} = quickConfig;

            switch (importType) {
              case 'default': {
                let importNamingType = defaultImportNamingType ?? 'as-is';

                if (
                  !isNamingTypeMatch(
                    importNamingType,
                    moduleSpecifier,
                    localIdentifier!.name,
                  )
                ) {
                  info.reported = true;

                  context.report({
                    node: localIdentifier!,
                    messageId: 'notUnderQuickConfig',
                    data: {
                      identifier: localIdentifier!.name,
                      importNamingType,
                    },
                  });
                }

                continue;
              }

              case 'named':
              case 'export-named': {
                let importNamingType = namedImportNamingType ?? 'as-is';

                if (
                  !isNamingTypeMatch(
                    importNamingType,
                    // Always exist in named import
                    importedIdentifier!.name,
                    localIdentifier!.name,
                  )
                ) {
                  info.reported = true;

                  context.report({
                    node: localIdentifier!,
                    messageId: 'notUnderQuickConfig',
                    data: {
                      identifier: localIdentifier!.name,
                      importNamingType,
                    },
                  });
                }

                continue;
              }
            }
          }

          // TODO (ooyyloo): add configuration regulation about these two import types
          if (importType === 'named' || importType === 'export-named') {
            continue;
          }

          if (allowedTypeInfos) {
            for (let allowedTypeInfo of allowedTypeInfos) {
              if (typeof allowedTypeInfo === 'string') {
                if (allowedTypeInfo !== importType) {
                  continue;
                }

                // Bypass type mismatch error report and hand it over to name
                // identical check
                allowed = true;

                if (
                  importType !== 'export-all' &&
                  handleNameIdenticalImport(
                    importTypeToImportIdentifyInfosDict,
                    notReportedGroups,
                    importType,
                    localIdentifier!,
                    'notMatchConfiguration',
                    moduleSpecifier,
                  )
                ) {
                  info.reported = true;
                }

                break;
              } else if (allowedTypeInfo.type === importType) {
                if (typeof allowedTypeInfo.identifiers === 'string') {
                  if (allowedTypeInfo.identifiers === '*') {
                    allowed = true;
                  } else if (allowedTypeInfo.identifiers === 'identical') {
                    // Same here, bypass
                    allowed = true;

                    if (
                      importType !== 'export-all' &&
                      handleNameIdenticalImport(
                        importTypeToImportIdentifyInfosDict,
                        notReportedGroups,
                        importType,
                        localIdentifier!,
                        'notMatchConfiguration',
                        moduleSpecifier,
                      )
                    ) {
                      info.reported = true;
                    }
                  } else {
                    throw new Error(
                      `Wrong Configuration: identifiers: ${allowedTypeInfo.identifiers}`,
                    );
                  }
                } else if (Array.isArray(allowedTypeInfo.identifiers)) {
                  if (
                    localIdentifier &&
                    allowedTypeInfo.identifiers.includes(localIdentifier.name)
                  ) {
                    allowed = true;
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
            info.reported = true;

            if (localIdentifier) {
              context.report({
                node: localIdentifier,
                messageId: 'notMatchConfiguration',
                data: {
                  identifier: localIdentifier.name,
                  moduleSpecifier,
                },
              });
            } else {
              context.report({
                node: (declaration as unknown) as TSESTree.Node,
                messageId: 'notMatchConfigurationForExportAll',
                data: {moduleSpecifier},
              });
            }
          }
        }
      }
    }

    function visitImportDeclaration(
      baseUrlDirName?: string,
    ): RuleFunction<TSESTree.ImportDeclaration> {
      return node => {
        let moduleSpecifier = node.source.value as string | null;

        if (node.source.type !== 'Literal' || !moduleSpecifier) {
          return;
        }

        let importInfos = resolveEveryImportTypeAndIdentifier(node);

        addReportInfoAndReportErrors(moduleSpecifier, importInfos, {
          baseUrlDirName,
        });
      };
    }

    function visitExportDeclaration(
      baseUrlDirName?: string | undefined,
    ): RuleFunction<
      TSESTree.ExportAllDeclaration | TSESTree.ExportNamedDeclaration
    > {
      return declaration => {
        let moduleSpecifier = (declaration.source as TSESTree.Literal)
          ?.value as string | null | undefined;

        if (declaration.source?.type !== 'Literal' || !moduleSpecifier) {
          return;
        }

        let importInfos = resolveEveryImportTypeAndIdentifier(declaration);

        addReportInfoAndReportErrors(moduleSpecifier, importInfos, {
          baseUrlDirName,
        });
      };
    }
  },
});