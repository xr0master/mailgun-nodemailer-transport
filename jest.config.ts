import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        useESM: false,
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },
  testRegex: '((\\.|/)(spec))\\.(ts?)$',
  moduleFileExtensions: ['ts', 'js'],
  modulePaths: ['src'],
  testPathIgnorePatterns: ['/node_modules/'],
  testEnvironment: 'node',
  preset: 'ts-jest',
};

module.exports = config;
