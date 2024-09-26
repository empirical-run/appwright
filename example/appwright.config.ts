import { defineConfig, Platform } from "appwright";
import { join } from "path";

export default defineConfig({
  reporter: [
    ["list"], // For real-time reporting on CI terminal (vs. the default "dot" reporter)
    ["json", { outputFile: "playwright-report/summary.json" }],
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
