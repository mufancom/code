import {AST_NODE_TYPES, TSESTree} from '@typescript-eslint/utils';

import {createRule} from './@utils';

const messages = {
  objectLiteralTypeAssertion:
    'Type assertion of an object literal is not allowed',
};

type Options = [];

type MessageId = keyof typeof messages;

export const noObjectLiteralTypeAssertionRule = createRule<Options, MessageId>({
  name: 'no-object-literal-type-assertion',
  meta: {
    docs: {
      description: '',
      recommended: 'error',
    },
    messages,
    schema: [],
    type: 'suggestion',
  },
  defaultOptions: [],
  create(context) {
    return {
      TSTypeAssertion: visit,
      TSAsExpression: visit,
    };

    function visit(
      node: TSESTree.TSTypeAssertion | TSESTree.TSAsExpression,
    ): void {
      if (
        node.expression.type === AST_NODE_TYPES.ObjectExpression &&
        !(
          node.typeAnnotation.type === AST_NODE_TYPES.TSTypeReference &&
          node.typeAnnotation.typeName.type === AST_NODE_TYPES.Identifier &&
          node.typeAnnotation.typeName.name === 'const'
        )
      ) {
        context.report({node, messageId: 'objectLiteralTypeAssertion'});
      }
    }
  },
});
