import { test as base } from "@playwright/test";
import { config } from "../../bs-config/webdriver_config";

import { DeviceProvider } from "../providers/device/browserstack";
import { Device } from "../providers/device/types";
import { AppwrightDriver } from "../providers/driver";
import { AppwrightLocator } from "../locator";

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
    const driver = await device.createDriver(config);
    await use(driver);
    console.log("==========Driver getting closed===========");
    await driver.close();
  },
  saveVideo: [
    async ({ device }, use, testInfo) => {
      await use();
      await device.setSessionStatus(testInfo.status, testInfo.error?.message);

      // // Download the video
      const videoData = await device.downloadVideo();
      console.log(`Video saved to: ${JSON.stringify(videoData)}`);

      // // Attach the video to the test report
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
    options?: { timeout: number },
  ) => {
    console.log("toBeVisible", locator.getPath());
    const isVisible = await locator.isElementVisibleWithinTimeout(options);
    console.log("=====> isVisible", isVisible);
    return {
      message: () =>
        isVisible
          ? ""
          : `Element ${locator.getPath()} was not found on the screen`,
      pass: isVisible,
      name: "toBeVisible",
      expected: true,
      actual: isVisible,
    };
  },
});
