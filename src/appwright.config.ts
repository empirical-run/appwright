import {
  defineConfig as defineConfigPlaywright,
  PlaywrightTestConfig,
} from "@playwright/test";
import { Config } from "./providers/device/types";

const appwrightConfig: PlaywrightTestConfig = {
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
  },
  expect: {
    timeout: 20_000,
  },
  timeout: 0,
};

export function defineConfig(config: PlaywrightTestConfig<Config>) {
  return defineConfigPlaywright<Config>({
    ...appwrightConfig,
    ...config,
  });
}
