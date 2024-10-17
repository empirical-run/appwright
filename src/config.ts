import {
  defineConfig as defineConfigPlaywright,
  PlaywrightTestConfig,
  ReporterDescription,
} from "@playwright/test";
import { AppwrightConfig } from "./types";
import path from "path";

const resolveGlobalSetup = () => {
  const pathToInstalledAppwright = require.resolve(".");
  const directory = path.dirname(pathToInstalledAppwright);
  return path.join(directory, "global-setup.js");
};

const resolveVideoReporter = () => {
  const pathToInstalledAppwright = require.resolve(".");
  const directory = path.dirname(pathToInstalledAppwright);
  return path.join(directory, "reporter.js");
};

const defaultConfig: PlaywrightTestConfig<AppwrightConfig> = {
  globalSetup: resolveGlobalSetup(),
  testDir: "./tests",
  // This is turned off so that a persistent device fixture can be
  // used across tests in a file where they run sequentially
  fullyParallel: false,
  forbidOnly: false,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [["list"], ["html", { open: "always" }]],
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
  const hasGlobalSetup = config.globalSetup !== undefined;
  if (hasGlobalSetup) {
    console.warn(
      "The `globalSetup` parameter in config will be ignored. See https://github.com/empirical-run/appwright/issues/57",
    );
    delete config.globalSetup;
  }
  let reporterConfig: ReporterDescription[];
  if (config.reporter) {
    reporterConfig = config.reporter as ReporterDescription[];
  } else {
    reporterConfig = [["list"], ["html", { open: "always" }]];
  }
  return defineConfigPlaywright<AppwrightConfig>({
    ...defaultConfig,
    ...config,
    reporter: [[resolveVideoReporter()], ...reporterConfig],
    use: {
      ...defaultConfig.use,
      expectTimeout: config.use?.expectTimeout
        ? config.use!.expectTimeout
        : defaultConfig.use?.expectTimeout,
    },
  });
}
