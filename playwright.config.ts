import { defineConfig } from "./src/appwright.config";
import { Platform } from "./src/providers/device/types";

export default defineConfig({
  testDir: "leap-tests/tests",
  projects: [
    {
      name: "ios",
      use: {
        platform: Platform.IOS,
        deviceName: "iPhone 14 Pro",
        osVersion: "16",
        buildURL: process.env.BROWSERSTACK_APP_URL,
      },
    },
    {
      name: "android",
      use: {
        platform: Platform.ANDROID,
        deviceName: "Google Pixel 8",
        osVersion: "14.0",
        buildURL: process.env.BROWSERSTACK_APP_URL,
      },
    },
  ],
});
