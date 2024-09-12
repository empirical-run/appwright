import { PlaywrightTestConfig } from "@playwright/test";

export const appwrightConfig: PlaywrightTestConfig = {
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
  expect: {
    timeout: 20_000,
  },
  timeout: 0,
};
