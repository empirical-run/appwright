import { test as base } from "@playwright/test";

import {
  AppwrightConfig,
  AppwrightLocator,
  DeviceProvider,
  WaitUntilOptions,
} from "../types";
import { Device } from "../device";
import { createDeviceProvider } from "../providers";

export const test = base.extend<{
  deviceProvider: DeviceProvider;
  device: Device;
  saveVideo: void;
}>({
  deviceProvider: async ({ }, use, testInfo) => {
    const config = testInfo.project.use as AppwrightConfig;
    const deviceProvider = createDeviceProvider(config);
    await use(deviceProvider);
  },
  device: async ({ deviceProvider }, use, testInfo) => {
    const device = await deviceProvider.getDevice();
    await deviceProvider.syncTestDetails({ name: testInfo.title });
    await use(device);
    await device.close();
  },
  saveVideo: [
    async ({ deviceProvider }, use, testInfo) => {
      await use();
      await deviceProvider.syncTestDetails({
        status: testInfo.status,
        reason: testInfo.error?.message,
      });
      const outputDir = testInfo.project.outputDir;
      const videoData = await deviceProvider.downloadVideo(
        outputDir,
        testInfo.testId,
      );
      console.log(`Video saved to: ${JSON.stringify(videoData)}`);

      if (videoData) {
        await testInfo.attach("video", videoData);
      }
    },
    { auto: true },
  ],
});

export const expect = test.expect.extend({
  toBeVisible: async (
    locator: AppwrightLocator,
    options?: WaitUntilOptions,
  ) => {
    const isVisible = await locator.isVisible(options);
    return {
      message: () => (isVisible ? "" : `Element was not found on the screen`),
      pass: isVisible,
      name: "toBeVisible",
      expected: true,
      actual: isVisible,
    };
  },
});
