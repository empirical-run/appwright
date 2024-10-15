import { test as base } from "@playwright/test";

import { AppwrightLocator, DeviceProvider, WaitUntilOptions } from "../types";
import { Device } from "../device";
import { createDeviceProvider } from "../providers";
import { logger } from "../logger";

export const test = base.extend<{
  /**
   * Device provider to be used for the test.
   * This creates and manages the device lifecycle for the test
   */
  deviceProvider: DeviceProvider;

  /**
   * The device instance that will be used for running the test.
   * This provides the functionality to interact with the device
   * during the test.
   */
  device: Device;

  /**
   * Saves the test video after completion and attach it to the test report.
   * Currently, this functionality is supported only for BrowserStack and LambdaTest.
   */
  saveVideo: void;
}>({
  deviceProvider: async ({ }, use, testInfo) => {
    const deviceProvider = createDeviceProvider(testInfo.project);
    await use(deviceProvider);
  },
  device: async ({ deviceProvider }, use, testInfo) => {
    const device = await deviceProvider.getDevice();
    await deviceProvider.syncTestDetails?.({ name: testInfo.title });
    await use(device);
    await device.close();
  },
  saveVideo: [
    async ({ deviceProvider }, use, testInfo) => {
      await use();
      await deviceProvider.syncTestDetails?.({
        name: testInfo.title,
        status: testInfo.status,
        reason: testInfo.error?.message,
      });
      const outputDir = testInfo.project.outputDir;
      const downloadPromise = deviceProvider
        .downloadVideo?.(outputDir, testInfo.testId)
        .then(async (videoData) => {
          if (videoData) {
            await testInfo.attach("video", videoData);
          }
        })
        .catch((error) => {
          logger.error(`saveVideo: ${error}`);
        });

      if (downloadPromise) {
        await downloadPromise;
      }
    },
    { auto: true },
  ],
});

/**
 * Function to extend Playwright’s expect assertion capabilities.
 * This adds a new method `toBeVisible` which checks if an element is visible on the screen.
 *
 * @param locator The AppwrightLocator that locates the element on the device screen.
 * @param options
 * @returns
 */
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
