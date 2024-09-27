import { defineConfig, Platform } from "appwright";
import { join } from "path";

export default defineConfig({
  reporter: [
    ["list"], // For real-time reporting on CI terminal (vs. the default "dot" reporter)
    ['html', { open: 'always' }],
  ],
  projects: [
    {
      name: "ios",
      use: {
        platform: Platform.IOS,
        device: {
          name: "iPhone 14 Pro",
          provider: "emulator",
        },
        buildPath: join(process.cwd(), "Wikipedia.app"),
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
