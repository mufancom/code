[![NPM version](https://img.shields.io/npm/v/@mufan/eslint-plugin?color=%23cb3837&style=flat-square)](https://www.npmjs.com/package/@mufan/eslint-plugin)
[![MIT License](https://img.shields.io/badge/license-MIT-999999?style=flat-square)](./LICENSE)
[![Discord](https://img.shields.io/badge/chat-discord-5662f6?style=flat-square)](https://discord.gg/vanVrDwSkS)

# @mufan/eslint-plugin

Flat-config-first ESLint plugin and shared config set.

## Usage

```js
import {defineConfig} from 'eslint/config';

import mufan, {configs} from '@mufan/eslint-plugin';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: {
      '@mufan': mufan,
    },
    extends: [configs.javascript],
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    plugins: {
      '@mufan': mufan,
    },
    extends: [configs.typescript],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
]);
```

The plugin exports:

- default export: plugin object
- named export `configs`
- named export `rules`

## License

MIT License.
