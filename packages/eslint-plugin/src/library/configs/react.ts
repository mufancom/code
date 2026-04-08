import type {ESLint, Linter} from 'eslint';
import reactPlugin from 'eslint-plugin-react';
import * as reactHooksPlugin from 'eslint-plugin-react-hooks';

export const react: Linter.Config[] = [
  {
    name: '@mufan/react',
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin as ESLint.Plugin,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-curly-brace-presence': ['error', 'never'],
      'react/self-closing-comp': [
        'error',
        {
          component: true,
          html: true,
        },
      ],
    },
  },
];
