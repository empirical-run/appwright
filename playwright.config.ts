import { defineConfig } from "./src/appwright.config";
import { Platform } from "./src/providers/device/types";

export default defineConfig({
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
