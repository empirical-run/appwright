import { defineConfig } from "@playwright/test";
import { appwrightConfig } from "./src/appwright.config";
import { Config, Platform } from "./src/providers/device/types";

export default defineConfig<Config>({
  ...appwrightConfig,
  testDir: "leap-tests/tests",
  projects: [
    {
      use: {
        platform: Platform.ANDROID,
        deviceName: "Google Pixel 8",
        osVersion: "14.0",
        buildURL: process.env.BROWSERSTACK_APP_URL || "",
      },
    },
  ],
});
