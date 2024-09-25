import {
  defineConfig as defineConfigPlaywright,
  PlaywrightTestConfig,
} from "@playwright/test";
import { AppwrightConfig } from "./types";

// eslint-disable-next-line unused-imports/no-unused-imports
import globalSetup from "./global-setup";

const resolveGlobalSetup = () => {
  const self = require.resolve(".");
  return self.replace("index.js", "global-setup.js");
};

const defaultConfig: PlaywrightTestConfig<AppwrightConfig> = {
  globalSetup: resolveGlobalSetup(),
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: false,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [["list"], ["json"], ["html"]],
  use: {
    actionTimeout: 20_000,
    expectTimeout: 20_000,
  },
  expect: {
    timeout: 20_000,
  },
  timeout: 0,
};

export function defineConfig(config: PlaywrightTestConfig<AppwrightConfig>) {
  return defineConfigPlaywright<AppwrightConfig>({
    ...defaultConfig,
    ...config,
    use: {
      ...defaultConfig.use,
      expectTimeout: config.use?.expectTimeout
        ? config.use!.expectTimeout
        : defaultConfig.use?.expectTimeout,
    },
  });
}
