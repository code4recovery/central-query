import type { JestConfigWithTsJest } from "ts-jest"

const jestConfig: JestConfigWithTsJest = {
  globalSetup: "../testEnv/setup.ts",
  globalTeardown: "../testEnv/teardown.ts",
  verbose: true,
  rootDir: "src",
  maxWorkers: 1,
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  fakeTimers: {
    enableGlobally: true,
    doNotFake: ["nextTick", "setImmediate"],
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 85,
      lines: 90,
      statements: 90,
    },
  },
}

export default jestConfig
