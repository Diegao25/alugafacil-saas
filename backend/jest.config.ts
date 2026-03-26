import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: 'src/__tests__/.*\\.test\\.ts$',
  testTimeout: 15000,
  clearMocks: false,
  resetMocks: true,
  moduleFileExtensions: ['ts', 'js', 'json'],
};

export default config;
