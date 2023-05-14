import type {TSESTree} from '@typescript-eslint/utils';
import {AST_NODE_TYPES} from '@typescript-eslint/utils';
import {isNodeBuiltIn, resolveWithCategory} from 'module-lens';
import type {Dict} from 'tslang';

import type {ModuleSpecifierHelperOptions} from './@utils';
import {
  ModuleSpecifierHelper,
  createRule,
  getFullStart,
  getModuleSpecifier,
  isRelativeModuleSpecifier,
  isTextualLiteral,
  trimLeftEmptyLines,
} from './@utils';

const messages = {
  unexpectedEmptyLine: 'Unexpected empty line within the same import group.',
  expectingEmptyLine:
    'Expecting an empty line between different import groups.',
  wrongModuleGroupOrder:
    'Import groups must be sorted according to given order.',
  notGrouped: 'Imports must be grouped.',
  unexpectedCodeBetweenImports: 'Unexpected code between import statements.',
};

type Options = [
  {
    groups: {
      name: string;
      test: string;
      sideEffect?: boolean;
    }[];
    baseUrl?: string;
    ordered?: boolean;
  },
];

type MessageId = keyof typeof messages;

export const importGroupsRule = createRule<Options, MessageId>({
  name: 'import-groups',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Validate that module imports are grouped as expected.',
      recommended: 'error',
    },
    messages,
    fixable: 'code',
    schema: [
      {
        type: 'object',
        required: ['groups', 'ordered'],
        properties: {
          groups: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'test'],
              properties: {
                name: {
                  type: 'string',
                },
                test: {
                  type: 'string',
                },
                sideEffect: {
                  type: 'boolean',
                  default: false,
                },
                baseUrl: {
                  type: 'string',
                },
              },
            },
          },
          ordered: {
            type: 'boolean',
            default: false,
          },
        },
      },
    ],
  },
  defaultOptions: [
    {
      groups: [
        {name: 'node-core', test: '$node-core'},
        {name: 'node-modules', test: '$node-modules'},
      ],
      ordered: false,
    },
  ],

  create(context, [options]) {
    const BUILT_IN_MODULE_GROUP_TESTER_DICT: Dict<ModuleGroupTester> = {
      '$node-core': specifier => isNodeBuiltIn(specifier),
      '$node-modules': (specifier, sourceFileName) => {
        const result = resolveWithCategory(specifier, {sourceFileName});
        return result.category === 'node-modules';
      },
    };

    interface ModuleGroupOptions {
      name: string;
      test: string;
      sideEffect?: boolean | undefined;
      baseUrl?: boolean | undefined;
    }

    interface RawOptions extends ModuleSpecifierHelperOptions {
      groups: ModuleGroupOptions[];
      ordered?: boolean;
    }

    type ModuleGroupTester = (
      specifier: string,
      sourceFileName: string,
    ) => boolean;

    class ModuleGroup {
      readonly name: string;

      private tester: ModuleGroupTester;
      private matchSideEffect: boolean | undefined;
      private matchUsingBaseUrl: boolean | undefined;

      constructor({
        name,
        test: testConfig,
        sideEffect,
        baseUrl,
      }: ModuleGroupOptions) {
        this.name = name;
        this.tester = this.buildTester(testConfig);
        this.matchSideEffect = sideEffect;
        this.matchUsingBaseUrl = baseUrl;
      }

      match(
        specifier: string,
        sideEffect: boolean,
        usingBaseUrl: boolean,
        sourceFileName: string,
      ): boolean {
        return (
          (this.matchSideEffect === undefined ||
            this.matchSideEffect === sideEffect) &&
          (this.matchUsingBaseUrl === undefined ||
            this.matchUsingBaseUrl === usingBaseUrl) &&
          this.tester(specifier, sourceFileName)
        );
      }

      private buildTester(config: string): ModuleGroupTester {
        if (config.startsWith('$')) {
          return (
            BUILT_IN_MODULE_GROUP_TESTER_DICT[config] || ((): boolean => false)
          );
        } else {
          const regex = new RegExp(config);
          return (path): boolean => regex.test(path);
        }
      }
    }

    interface ModuleImportInfo {
      node: TSESTree.Node;
      groupIndex: number;
      /** 节点开始行. */
      startLine: number;
      /** 节点结束行. */
      endLine: number;
    }

    class ImportGroupWalker {
      private moduleImportInfos: ModuleImportInfo[] = [];
      private pendingStatements: TSESTree.ProgramStatement[] = [];

      private moduleSpecifierHelper = new ModuleSpecifierHelper(
        context.getFilename(),
        options,
      );

      walk(): void {
        let pendingCache: TSESTree.ProgramStatement[] = [];

        const checkWithAppendModuleImport = (
          expression: TSESTree.Expression,
          sideEffect: boolean,
        ): void => {
          this.pendingStatements.push(...pendingCache);
          pendingCache = [];

          if (isTextualLiteral(expression)) {
            this.appendModuleImport(expression, sideEffect);
          }
        };

        for (const statement of context.getSourceCode().ast.body) {
          if (statement.type === AST_NODE_TYPES.ImportDeclaration) {
            checkWithAppendModuleImport(
              statement.source,
              statement.specifiers.length === 0,
            );
          } else if (
            statement.type === AST_NODE_TYPES.TSImportEqualsDeclaration
          ) {
            if (
              statement.moduleReference.type ===
                AST_NODE_TYPES.TSExternalModuleReference &&
              statement.moduleReference.expression !== undefined
            ) {
              checkWithAppendModuleImport(
                statement.moduleReference.expression,
                false,
              );
            }
          } else {
            pendingCache.push(statement);
          }
        }

        this.validate();
      }

      private appendModuleImport(
        expression: TSESTree.Expression,
        sideEffect: boolean,
      ): void {
        let node: TSESTree.Node = expression;

        while (node.parent && node.parent.type !== AST_NODE_TYPES.Program) {
          node = node.parent;
        }

        const specifier = getModuleSpecifier(
          context.getSourceCode(),
          expression,
        );

        const sourceFileName = context.getFilename();

        const {groups: groupConfigItems, baseUrl} = options as RawOptions;
        const groups = groupConfigItems.map(item => new ModuleGroup(item));

        const helper = this.moduleSpecifierHelper;

        let usingBaseUrl = false;

        if (
          typeof baseUrl === 'string' &&
          !isRelativeModuleSpecifier(specifier)
        ) {
          const path = helper.resolve(specifier);

          if (path && helper.isPathWithinBaseUrlDir(path)) {
            usingBaseUrl = true;
          }
        }

        const index = groups.findIndex(group =>
          group.match(specifier, sideEffect, usingBaseUrl, sourceFileName),
        );

        const start = node.range[0];

        let fullStart = start;

        let fullStartLine: number | undefined;

        for (let i = 0; i < node.parent!.body.length; ++i) {
          if (node.parent!.body[i] === node) {
            if (i !== 0) {
              fullStart = node.parent!.body[i - 1].range[1];
              fullStartLine = node.parent!.body[i - 1].loc.end.line;
            } else {
              fullStart = 0;
              fullStartLine = 1;
            }

            break;
          }
        }

        const precedingText = context
          .getSourceCode()
          .getText(node, start - fullStart)
          .slice(0, start - fullStart);

        const emptyLinesBeforeStart = (
          precedingText.replace(/^.*\r?\n/, '').match(/^\s*$/gm) || []
        ).length;

        this.moduleImportInfos.push({
          node,
          // 如果没有找到匹配的分组, 则归到 "其他" 一组, groupIndex 为 groups.length.
          groupIndex: index < 0 ? groups.length : index,
          startLine: fullStartLine! + emptyLinesBeforeStart,
          endLine: node.loc.end.line,
        });
      }

      private validate(): void {
        const infos = this.moduleImportInfos;
        const pendingStatements = this.pendingStatements;

        if (!infos.length) {
          return;
        }

        interface FailureItem {
          node: TSESTree.Node;
          messageId: MessageId;
        }

        const {ordered} = options;
        const failureItems: FailureItem[] = [];
        let [lastInfo, ...restInfos] = infos;
        const fixerEnabled = !pendingStatements.length;
        const appearedGroupIndexSet = new Set([lastInfo.groupIndex]);

        for (const expression of pendingStatements) {
          failureItems.push({
            node: expression,
            messageId: 'unexpectedCodeBetweenImports',
          });
        }

        for (const info of restInfos) {
          let checkOrdering = ordered;

          if (info.groupIndex === lastInfo.groupIndex) {
            // 只在分组第一项检查分组顺序.
            checkOrdering = false;

            // 如果当前分组和上一份组 groupIndex 相同, 则校验是否多了空行.
            if (info.startLine - lastInfo.endLine > 1) {
              failureItems.push({
                node: info.node,
                messageId: 'unexpectedEmptyLine',
              });
            }
          } else {
            // 检验该组是否已经出现过.
            if (appearedGroupIndexSet.has(info.groupIndex)) {
              checkOrdering = false;

              failureItems.push({
                node: info.node,
                messageId: 'notGrouped',
              });
            }
            // 如果未出现过则校验是否少了空行.
            else if (info.startLine - lastInfo.endLine < 2) {
              failureItems.push({
                node: info.node,
                messageId: 'expectingEmptyLine',
              });
            }
          }

          if (checkOrdering) {
            // 在要求分组顺序的情况下, 如果当前分组的 groupIndex 小于上一个分组的,
            // 则说明顺序错误.
            if (info.groupIndex < lastInfo.groupIndex) {
              failureItems.push({
                node: info.node,
                messageId: 'wrongModuleGroupOrder',
              });
            }
          }

          appearedGroupIndexSet.add(info.groupIndex);

          lastInfo = info;
        }

        if (failureItems.length) {
          for (const {node, messageId} of failureItems) {
            if (fixerEnabled) {
              context.report({
                node,
                messageId,
                fix: fixer => {
                  const {ordered = false} = options;

                  const startNode = infos[0].node;
                  const endNode = infos[infos.length - 1].node;

                  const infoGroups = groupModuleImportInfos(infos, ordered);

                  const text = infoGroups
                    .map(group =>
                      group
                        .map(info =>
                          trimLeftEmptyLines(
                            context
                              .getSourceCode()
                              .getText(
                                info.node,
                                info.node.range[0] -
                                  getFullStart(
                                    context.getSourceCode(),
                                    info.node,
                                  ),
                              ),
                          ),
                        )
                        .join('\n'),
                    )
                    .join('\n\n');

                  return fixer.replaceTextRange(
                    [
                      getFullStart(context.getSourceCode(), startNode),
                      endNode.range[1],
                    ],
                    text,
                  );
                },
              });
            } else {
              context.report({
                node,
                messageId,
              });
            }
          }
        }
      }
    }

    function groupModuleImportInfos(
      infos: ModuleImportInfo[],
      ordered: boolean,
    ): ModuleImportInfo[][] {
      // 这里利用了 Map 和 Set 枚举顺序和键加入顺序一致的特性. 如果不需要按顺序分
      // 组, 则遵照分组出现顺序.
      const infoGroupMap = new Map<number, ModuleImportInfo[]>();

      for (const info of infos) {
        let infoGroup = infoGroupMap.get(info.groupIndex);

        if (infoGroup) {
          infoGroup.push(info);
        } else {
          infoGroup = [info];
          infoGroupMap.set(info.groupIndex, infoGroup);
        }
      }

      if (ordered) {
        return Array.from(infoGroupMap.entries())
          .sort(([indexX], [indexY]) => indexX - indexY)
          .map(([, infoGroup]) => infoGroup);
      } else {
        return Array.from(infoGroupMap.values());
      }
    }

    // ---------------------------------------------------------------------------------- //

    new ImportGroupWalker().walk();
    return {};
  },
});
