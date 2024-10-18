import { test as base, FullProject } from "@playwright/test";
import fs from "fs";
import path from "path";

import {
  AppwrightLocator,
  DeviceProvider,
  ActionOptions,
  AppwrightConfig,
} from "../types";
import { Device } from "../device";
import { createDeviceProvider, getProviderClass } from "../providers";

type TestLevelFixtures = {
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
};

type WorkerLevelFixtures = {
  persistentDevice: Device;
};

export const test = base.extend<TestLevelFixtures, WorkerLevelFixtures>({
  deviceProvider: async ({}, use, testInfo) => {
    const deviceProvider = createDeviceProvider(testInfo.project);
    await use(deviceProvider);
  },
  device: async ({ deviceProvider }, use, testInfo) => {
    const device = await deviceProvider.getDevice();
    testInfo.annotations.push({
      type: "providerName",
      description: (testInfo.project as FullProject<AppwrightConfig>).use.device
        ?.provider,
    });
    testInfo.annotations.push({
      type: "sessionId",
      description: deviceProvider.sessionId,
    });
    await deviceProvider.syncTestDetails?.({ name: testInfo.title });
    await use(device);
    await device.close();
    await deviceProvider.syncTestDetails?.({
      name: testInfo.title,
      status: testInfo.status,
      reason: testInfo.error?.message,
    });
  },
  persistentDevice: [
    async ({}, use, workerInfo) => {
      const { project, workerIndex } = workerInfo;
      const deviceProvider = createDeviceProvider(project);
      const device = await deviceProvider.getDevice();
      const sessionId = deviceProvider.sessionId;
      // Save session start time to disk for the reporter to use (to trim video)
      const startTime = new Date();
      const basePath = `${process.cwd()}/playwright-report/videos-store`;
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath);
      }
      fs.writeFileSync(
        path.join(basePath, `worker-${workerIndex}-start-time`),
        startTime.toISOString(),
      );
      await use(device);
      await device.close();
      console.log(`Teardown for worker ${workerIndex}, will download video`);
      const providerName = (project as FullProject<AppwrightConfig>).use.device
        ?.provider;
      const providerClass = getProviderClass(providerName!);
      const fileName = `worker-${workerIndex}-video`;
      await providerClass.downloadVideo(sessionId, basePath, fileName);
    },
    { scope: "worker" },
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
  toBeVisible: async (locator: AppwrightLocator, options?: ActionOptions) => {
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
