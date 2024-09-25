import { test as base } from "@playwright/test";

import { DeviceProvider } from "../providers";
import { AppwrightLocator, IDeviceProvider, WaitUntilOptions } from "../types";
import { Device } from "../device";

export const test = base.extend<{
  deviceProvider: IDeviceProvider;
  device: Device;
  saveVideo: void;
}>({
  deviceProvider: async ({}, use, testInfo) => {
    const provider = DeviceProvider.getInstance(testInfo);
    await use(provider);
  },
  device: async ({ deviceProvider }, use) => {
    const device = await deviceProvider.getDevice();
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

      const videoData = await deviceProvider.downloadVideo();
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
