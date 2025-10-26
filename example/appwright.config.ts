import { defineConfig, Platform } from "appwright";
import path from "path";

export default defineConfig({
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
      },
    },
  ],
});
