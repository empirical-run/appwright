import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "leap-tests/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 0,
  reporter: [["json", { outputFile: "results.json" }], ["html"]],
  use: {
    trace: "on-first-retry",
  },
});
