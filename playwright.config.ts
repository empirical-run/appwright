import { defineConfig } from "@playwright/test";
import { baseConfig } from "@empiricalrun/playwright-utils";
import { DeviceSessionConfig, Platform } from "./src/providers/device/types";

export default defineConfig<DeviceSessionConfig>({
  ...baseConfig,
  testDir: "leap-tests/tests",
  fullyParallel: true,
  workers: 2,
  use: {
    projectName: "Leap Wallet",
  },
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
