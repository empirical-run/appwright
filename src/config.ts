import {
  defineConfig as defineConfigPlaywright,
  PlaywrightTestConfig,
} from "@playwright/test";
import { AppwrightConfig } from "./types";
import path from "path";

// This import ensures global-setup is built by TypeScript
// eslint-disable-next-line unused-imports/no-unused-imports, no-unused-vars
import globalSetup from "./global-setup";

const resolveGlobalSetup = () => {
  const pathToInstalledAppwright = require.resolve(".");
  const directory = path.dirname(pathToInstalledAppwright);
  return path.join(directory, "global-setup.js");
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
    // TODO: Use this for actions
    actionTimeout: 20_000,
    expectTimeout: 20_000,
  },
  expect: {
    // This is not used right now
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
