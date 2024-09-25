import { test as base } from "@playwright/test";

import { DeviceProvider } from "../providers";
import { AppwrightLocator, IDeviceProvider, WaitUntilOptions } from "../types";
import { Device } from "../device";

export const test = base.extend<{
  provider: IDeviceProvider;
  device: Device;
  saveVideo: void;
}>({
  provider: async ({}, use, testInfo) => {
    const provider = DeviceProvider.getInstance(testInfo);
    await use(provider);
  },
  device: async ({ provider }, use) => {
    const device = await provider.getDevice();
    await use(device);
    await device.close();
  },
  saveVideo: [
    async ({ provider }, use, testInfo) => {
      await use();
      await provider.syncTestDetails({
        status: testInfo.status,
        reason: testInfo.error?.message,
      });

      const videoData = await provider.downloadVideo();
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
