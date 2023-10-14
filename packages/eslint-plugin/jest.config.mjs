/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  resolver: 'ts-jest-resolver',
  rootDir: 'src/test',
  testMatch: ['<rootDir>/*.test.ts'],
};
