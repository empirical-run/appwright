import { Device } from "../device";

export type WaitUntilOptions = {
  /**
   * The maximum amount of time (in milliseconds) to wait for the condition to be met.
   */
  timeout: number;
};

export type TestInfoOptions = {
  /**
   * The maximum amount of time (in milliseconds) to wait for the condition to be met.
   */
  expectTimeout: number;
};

export interface DeviceProvider {
  /**
   * Global setup validates the configuration.
   */
  globalSetup?(): Promise<void>;

  /**
   * Returns a device instance.
   */
  getDevice(): Promise<Device>;

  /**
   * Downloads the video of the test.
   * Currently, this functionality is supported only for BrowserStack.
   *
   * @param outputDir directory to save the video
   * @param fileName name of the downloaded video file
   * @returns
   */
  downloadVideo?: (
    outputDir: string,
    fileName: string,
  ) => Promise<{ path: string; contentType: string } | null>;

  /**
   * Updates test details and test status.
   *
   * @param status of the test
   * @param reason for the test status
   * @param name of the test
   */
  syncTestDetails?: (details: {
    status?: string;
    reason?: string;
    name?: string;
  }) => Promise<void>;
}

export type AppwrightConfig = {
  platform: Platform;
  device: DeviceConfig;
  buildPath: string;
  // TODO: use expect timeout from playwright config
  expectTimeout: number;
};

export type DeviceConfig =
  | BrowserstackConfig
  | LambdatestConfig
  | LocalDeviceConfig
  | EmulatorConfig;

/**
 * Configuration for devices running on Browserstack.
 */
export type BrowserstackConfig = {
  provider: "browserstack";

  /**
   * The name of the device to be used on Browserstack.
   * Checkout the list of devices supported by BrowserStack: https://www.browserstack.com/list-of-browsers-and-platforms/app_automate
   * Example: "iPhone 15 Pro Max", "Samsung Galaxy S23 Ultra".
   */
  name: string;

  /**
   * The operating system version of the device to be used on Browserstack.
   * Checkout the list of OS versions supported by BrowserStack: https://www.browserstack.com/list-of-browsers-and-platforms/app_automate
   * Example: "14.0", "15.0".
   */
  osVersion: string;
};

export type LambdatestConfig = {
  provider: "lambdatest";

  /**
   * The name of the device to be used on LambdaTest.
   * Checkout the list of devices supported by LambdaTest: https://www.lambdatest.com/list-of-real-devices
   * Example: "iPhone 15 Pro Max", "Galaxy S23 Ultra".
   */
  name: string;

  /**
   * The operating system version of the device to be used on LambdaTest.
   * Checkout the list of OS versions supported by LambdaTest: https://www.lambdatest.com/list-of-real-devices
   * Example: "14.0", "15.0".
   */
  osVersion: string;
};

/**
 * Configuration for locally connected physical devices.
 */
export type LocalDeviceConfig = {
  provider: "local-device";
  name?: string;

  /**
   * The unique device identifier (UDID) of the connected local device.
   */
  udid?: string;
};

/**
 * Configuration for running tests on an Android or iOS emulator.
 */
export type EmulatorConfig = {
  provider: "emulator";
  name?: string;
  osVersion?: string;
};

export enum Platform {
  ANDROID = "android",
  IOS = "ios",
}

export interface AppwrightLocator {
  /**
   * Taps (clicks) on the element. This method waits for the element to be visible before clicking it.
   *
   * **Usage:**
   * ```js
   * await device.getByText("Submit").click();
   * ```
   *
   * @param options Use this to override the timeout for this action
   */
  tap(options?: WaitUntilOptions): Promise<void>;

  /**
   * Fills the input element with the given value. This method waits for the element to be visible before filling it.
   *
   * **Usage:**
   * ```js
   * await device.getByText("Search").fill("My query");
   * ```
   *
   * @param value The value to fill in the input field
   * @param options Use this to override the timeout for this action
   */
  fill(value: string, optionasds?: WaitUntilOptions): Promise<void>;

  /**
   * Sends key strokes to the element. This method waits for the element to be visible before sending the key strokes.
   *
   * **Usage:**
   * ```js
   * await device.getByText("Search").sendKeyStrokes("My query");
   * ```
   *
   * @param value The string to send as key strokes.
   * @param options Use this to override the timeout for this action
   */
  sendKeyStrokes(value: string, options?: WaitUntilOptions): Promise<void>;

  /**
   * Checks if the element is visible on the page, while attempting for the `timeout` duration. Returns `true` if the element is visible, `false` otherwise.
   *
   * **Usage:**
   * ```js
   * const isVisible = await device.getByText("Search").isVisible();
   * ```
   *
   * @param options Use this to override the timeout for this action
   */
  isVisible(options?: WaitUntilOptions): Promise<boolean>;

  /**
   * Returns the text content of the element. This method waits for the element to be visible before getting the text.
   *
   * **Usage:**
   * ```js
   * const textContent = await device.getByText("Search").getText();
   * ```
   *
   * @param options Use this to override the timeout for this action
   */
  getText(options?: WaitUntilOptions): Promise<string>;
}

export enum WebdriverErrors {
  StaleElementReferenceError = "stale element reference",
}

export type ElementReference = Record<ElementReferenceId, string>;
export type ElementReferenceId = "element-6066-11e4-a52e-4f735466cecf";
