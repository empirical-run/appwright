import { Device } from "../device";

export type WaitUntilOptions = {
  timeout: number;
};

export type TestInfoOptions = {
  expectTimeout: number;
};

export interface DeviceProvider {
  getDevice(): Promise<Device>;
  downloadVideo: () => Promise<{ path: string; contentType: string } | null>;
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
  expectTimeout?: number;
};

export enum Platform {
  ANDROID = "android",
  IOS = "ios",
}

export interface IDevice {
  close: () => Promise<void>;

  tap: ({ x, y }: { x: number; y: number }) => Promise<void>;

  getByText: (
    text: string | RegExp,
    options?: { exact?: boolean },
  ) => AppwrightLocator;

  getById: (
    text: string | RegExp,
    options?: { exact?: boolean },
  ) => AppwrightLocator;

  getByXpath: (xpath: string) => AppwrightLocator;

  getClipboardText: () => Promise<string>;

  beta: {
    tap: (prompt: string) => Promise<void>;
    extractText: (prompt: string) => Promise<string>;
  };

  getPlatform: () => Platform;
}

export interface AppwrightLocator {
  /**
   * Clicks (taps) on the element. This method waits for the element to be visible before clicking it.
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
