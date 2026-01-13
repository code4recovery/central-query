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
}

export default jestConfig
