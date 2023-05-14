module.exports = {
  extends: ['plugin:@mufan/default'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    '@mufan/import-type-unification': ['error'],
  },
};
