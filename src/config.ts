import {
  defineConfig as defineConfigPlaywright,
  PlaywrightTestConfig,
} from "@playwright/test";
import { AppWrightConfig } from "./providers/device/types";

const defaultConfig: PlaywrightTestConfig<AppWrightConfig> = {
  testDir: "./tests",
  outputDir: "./playwright-report/data", // to store default playwright artifacts (during and post test run)
  fullyParallel: true,
  forbidOnly: false,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [
    ["list"], // For real-time reporting on CI terminal (vs. the default "dot" reporter)
    ["json", { outputFile: "playwright-report/summary.json" }],
    ["./node_modules/@empiricalrun/playwright-utils/dist/reporter/custom.js"],
  ],
  use: {
    actionTimeout: 20_000,
    expectTimeout: 20_000,
  },
  expect: {
    timeout: 20_000,
  },
  timeout: 0,
};

export function defineConfig(config: PlaywrightTestConfig<AppWrightConfig>) {
  return defineConfigPlaywright<AppWrightConfig>({
    ...defaultConfig,
    ...config,
    use: {
      ...defaultConfig.use,
      expectTimeout:
        //@ts-ignore
        config.expectTimeout === undefined
          ? defaultConfig.use?.expectTimeout
          : //@ts-ignore
            config.expectTimeout,
    },
  });
}
