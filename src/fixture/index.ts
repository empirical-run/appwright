import { test as base } from "@playwright/test";

import { DeviceProvider } from "../providers/device/browserstack";
import { Device } from "../providers/device/types";
import { AppwrightDriver } from "../providers/driver";
import { AppwrightLocator } from "../locator";
import { WaitUntilOptions } from "../types";

export const test = base.extend<{
  device: Device;
  client: AppwrightDriver;
  saveVideo: void;
}>({
  device: async ({}, use, testInfo) => {
    const device = await DeviceProvider.getDevice(testInfo);
    await use(device);
  },
  client: async ({ device }, use) => {
    const driver = await device.createDriver();
    await use(driver);
    await driver.close();
  },
  saveVideo: [
    async ({ device }, use, testInfo) => {
      await use();
      await device.setSessionStatus(testInfo.status, testInfo.error?.message);

      const videoData = await device.downloadVideo();
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
      message: () =>
        isVisible
          ? ""
          : `Element ${locator.getSelector()} was not found on the screen`,
      pass: isVisible,
      name: "toBeVisible",
      expected: true,
      actual: isVisible,
    };
  },
});
