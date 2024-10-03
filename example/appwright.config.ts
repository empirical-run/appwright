import { defineConfig, Platform } from "appwright";
import { join } from "path";

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
        buildPath: join(process.cwd(), "wikipedia.app"),
      },
    },
    {
      name: "android",
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: "emulator",
        },
        buildPath: join(process.cwd(), "wikipedia.apk"),
      },
    },
  ],
});
