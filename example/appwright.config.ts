import { defineConfig, Platform } from "appwright";
import path from "path";

export default defineConfig({
  retries: 1,
  projects: [
    {
      name: "ios",
      use: {
        platform: Platform.IOS,
        device: {
          provider: "emulator",
          name: "iPhone 14 Pro",
        },
        buildPath: path.join("builds", "Wikipedia.app"),
        trace: "on",
      },
    },
    {
      name: "android",
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: "emulator",
        },
        buildPath: path.join("builds", "wikipedia.apk"),
        trace: "on",
        video: "on",
      },
    },
  ],
});
