module.exports = {
  roots: ['<rootDir>/packages'],
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // workaround: https://github.com/facebook/jest/issues/6766
  testURL: 'http://localhost',
  transformIgnorePatterns: ['node_modules/(?!pearl|@tboyt/coroutine-manager)'],
  globals: {
    'ts-jest': {
      tsConfigFile: './jest.tsconfig.json',
    },
  },
};
