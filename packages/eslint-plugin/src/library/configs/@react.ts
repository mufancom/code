import type {Linter} from 'eslint';

export default {
  plugins: ['react', 'react-hooks'],
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
} satisfies Linter.Config;
