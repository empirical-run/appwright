import { Device } from "../device";

export type WaitUntilOptions = {
  timeout: number;
};

export type TestInfoOptions = {
  expectTimeout: number;
};

export interface DeviceProvider {
  globalSetup(): Promise<void>;
  getDevice(): Promise<Device>;
  downloadVideo: (
    outputDir: string,
    testId: string,
  ) => Promise<{ path: string; contentType: string } | null>;
  syncTestDetails: (details: {
    status?: string;
    reason?: string;
    name?: string;
  }) => Promise<void>;
}

export type AppwrightConfig = {
  platform: Platform;
  deviceName: string;
  osVersion: string;
  buildPath: string;
  // TODO: use expect timeout from playwright config
  expectTimeout: number;
};

export enum Platform {
  ANDROID = "android",
  IOS = "ios",
}

export interface IDevice {
  /**
   * Helper method to identify which the mobile OS running on the device.
   * @returns "android" or "ios"
   */
  getPlatform: () => Platform;

  /**
   * Closes the automation session. This is called automatically after each test.
   */
  close: () => Promise<void>;

  /**
   * Tap on the screen at the given coordinates, specified as x and y. The top left corner
   * of the screen is { x: 0, y: 0 }.
   *
   * @param coordinates to tap on
   * @returns
   */
  tap: ({ x, y }: { x: number; y: number }) => Promise<void>;

  /**
   * Locate an element on the screen with text content. This method defaults to a
   * substring match, and this be overridden by setting the `exact` option to `true`.
   *
   * **Usage:**
   * ```js
   * // with string
   * const submitButton = device.getByText("Submit");
   *
   * // with RegExp
   * const counter = device.getByText(/^Counter: \d+/);
   * ```
   *
   * @param text string or regular expression to search for
   * @param options
   * @returns
   */
  getByText: (
    text: string | RegExp,
    options?: { exact?: boolean },
  ) => AppwrightLocator;

  /**
   * Locate an element on the screen with accessibility identifier. This method defaults to
   * a substring match, and this can be overridden by setting the `exact` option to `true`.
   *
   * @param text string or regular expression to search for
   * @param options
   * @returns
   */
  getById: (
    text: string | RegExp,
    options?: { exact?: boolean },
  ) => AppwrightLocator;

  getByXpath: (xpath: string) => AppwrightLocator;

  /**
   * Retrieves text content from the clipboard of the mobile device. This is useful
   * after a "copy to clipboard" action has been performed.
   *
   * @returns Returns the text content of the clipboard.
   */
  getClipboardText: () => Promise<string>;

  beta: {
    tap: (prompt: string) => Promise<void>;
    extractText: (prompt: string) => Promise<string>;
  };
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
