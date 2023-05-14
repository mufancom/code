import type {TSESTree} from '@typescript-eslint/utils';
import {AST_NODE_TYPES} from '@typescript-eslint/utils';
import * as jsdiff from 'diff';
import _ from 'lodash';
import type TypeScript from 'typescript';

import {createRule, getParserServices} from './@utils';

const messages = {
  wrongPosition: 'The key "{{key}}" is at wrong position.',
};

type Options = [];

type MessageId = keyof typeof messages;

export const strictKeyOrderRule = createRule<Options, MessageId>({
  name: 'strict-key-order',
  meta: {
    docs: {
      description:
        'Check if the order of object keys matches the order of the type',
      recommended: 'error',
    },
    messages,
    schema: [],
    type: 'suggestion',
  },
  defaultOptions: [],

  create(context) {
    interface PropertyKeyInfo {
      key: string;
      index: number;
    }

    const parserServices = getParserServices(context);
    const typeChecker = parserServices.program.getTypeChecker();

    function mapIteratorToArray(
      iterator: IterableIterator<TypeScript.__String>,
    ): string[] {
      const result: string[] = [];

      for (
        let iterResult = iterator.next();
        !iterResult.done;
        iterResult = iterator.next()
      ) {
        result.push(iterResult.value as string);
      }

      return result;
    }

    function check(node: TSESTree.VariableDeclarator): void {
      const typeAnnotation = node.id.typeAnnotation;
      const init = node.init;

      if (
        !typeAnnotation ||
        typeAnnotation.typeAnnotation.type !== AST_NODE_TYPES.TSTypeReference ||
        !init ||
        init.type !== AST_NODE_TYPES.ObjectExpression
      ) {
        return;
      }

      const comments = context
        .getSourceCode()
        .getCommentsBefore(typeAnnotation.typeAnnotation);

      const strictOrderSpecified = _.some(
        comments.map(comment => {
          return comment.value.trim() === 'strict-key-order';
        }),
      );

      if (!strictOrderSpecified) {
        return;
      }

      const typeNode = parserServices.esTreeNodeToTSNodeMap.get(
        typeAnnotation.typeAnnotation,
      );

      const typeNodeMembers =
        typeChecker.getTypeAtLocation(typeNode).symbol.members;

      const typeKeys = typeNodeMembers
        ? mapIteratorToArray(typeNodeMembers.keys())
        : [];

      const propertyKeyInfos: PropertyKeyInfo[] = _.compact(
        init.properties.map((property, index) => {
          if (property.type !== AST_NODE_TYPES.Property) {
            return undefined;
          }

          if (property.key.type === AST_NODE_TYPES.Literal) {
            return {key: property.key.value as string, index};
          }

          if (property.key.type === AST_NODE_TYPES.Identifier) {
            return {key: property.key.name, index};
          }

          return undefined;
        }),
      );
      const propertyKeys = propertyKeyInfos.map(
        propertyKeyInfo => propertyKeyInfo.key,
      );

      const typeKeySet = new Set(typeKeys);

      const diffResult = jsdiff.diffArrays(typeKeys, propertyKeys);

      let propertyKeyIndex = 0;

      for (const diffResultPart of diffResult) {
        if (diffResultPart.added) {
          for (let i = 0; i < diffResultPart.value.length; ++i) {
            const key = diffResultPart.value[i];
            const property = init.properties[
              propertyKeyInfos[propertyKeyIndex + i].index
            ] as TSESTree.Property;

            if (typeKeySet.has(key)) {
              context.report({
                node: property.key,
                messageId: 'wrongPosition',
                data: {
                  key,
                },
              });
            }
          }
        }

        if (!diffResultPart.removed) {
          propertyKeyIndex += diffResultPart.value.length;
        }
      }
    }

    return {
      VariableDeclarator: check,
    };
  },
});
