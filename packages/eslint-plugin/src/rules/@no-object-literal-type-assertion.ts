import {AST_NODE_TYPES} from '@typescript-eslint/experimental-utils';

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
      TSTypeAssertion(node) {
        if (node.expression.type === AST_NODE_TYPES.ObjectExpression) {
          context.report({node, messageId: 'objectLiteralTypeAssertion'});
        }
      },
      TSAsExpression(node) {
        if (node.expression.type === AST_NODE_TYPES.ObjectExpression) {
          context.report({node, messageId: 'objectLiteralTypeAssertion'});
        }
      },
    };
  },
});
