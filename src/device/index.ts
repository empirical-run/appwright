// @ts-ignore ts not able to identify the import is just an interface
import type { Client as WebDriverClient } from "webdriver";
import { Locator } from "../locator";
import {
  AppwrightLocator,
  ExtractType,
  Platform,
  TimeoutOptions,
} from "../types";
import { AppwrightVision, VisionProvider } from "../vision";
import { boxedStep, longestDeterministicGroup } from "../utils";
import { uploadImageToBS } from "../providers/browserstack/utils";
import { uploadImageToLambdaTest } from "../providers/lambdatest/utils";
import { z } from "zod";
import { LLMModel } from "@empiricalrun/llm";
import { logger } from "../logger";

export class Device {
  constructor(
    private webDriverClient: WebDriverClient,
    private bundleId: string | undefined,
    private timeoutOpts: TimeoutOptions,
    private provider: string,
  ) {}

  locator({
    selector,
    findStrategy,
    textToMatch,
  }: {
    selector: string;
    findStrategy: string;
    textToMatch?: string | RegExp;
  }): AppwrightLocator {
    return new Locator(
      this.webDriverClient,
      this.timeoutOpts,
      selector,
      findStrategy,
      textToMatch,
    );
  }

  private vision(): AppwrightVision {
    return new VisionProvider(this, this.webDriverClient);
  }

  beta = {
    tap: async (
      prompt: string,
      options?: { useCache?: boolean },
    ): Promise<{ x: number; y: number }> => {
      return await this.vision().tap(prompt, options);
    },

    query: async <T extends z.ZodType>(
      prompt: string,
      options?: {
        responseFormat?: T;
        model?: LLMModel;
        screenshot?: string;
      },
    ): Promise<ExtractType<T>> => {
      return await this.vision().query(prompt, options);
    },
  };

  /**
   * Closes the automation session. This is called automatically after each test.
   *
   * **Usage:**
   * ```js
   * await device.close();
   * ```
   */
  async close() {
    // TODO: Add @boxedStep decorator here
    // Disabled because it breaks persistentDevice as test.step will throw as test is
    // undefined when the function is called
    try {
      await this.webDriverClient.deleteSession();
    } catch (e) {
      logger.error(`close:`, e);
    }
  }

  /**
   * Tap on the screen at the given coordinates, specified as x and y. The top left corner
   * of the screen is { x: 0, y: 0 }.
   *
   * **Usage:**
   * ```js
   * await device.tap({ x: 100, y: 100 });
   * ```
   *
   * @param coordinates to tap on
   * @returns
   */
  @boxedStep
  async tap({ x, y }: { x: number; y: number }) {
    if (this.getPlatform() == Platform.ANDROID) {
      await this.webDriverClient.executeScript("mobile: clickGesture", [
        {
          x: x,
          y: y,
          duration: 100,
          tapCount: 1,
        },
      ]);
    } else {
      await this.webDriverClient.executeScript("mobile: tap", [
        {
          x: x,
          y: y,
        },
      ]);
    }
  }

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
  getByText(
    text: string | RegExp,
    { exact = false }: { exact?: boolean } = {},
  ): AppwrightLocator {
    const isAndroid = this.getPlatform() == Platform.ANDROID;
    if (text instanceof RegExp) {
      const substringForContains = longestDeterministicGroup(text);
      if (!substringForContains) {
        return this.locator({
          selector: "//*",
          findStrategy: "xpath",
          textToMatch: text,
        });
      } else {
        const selector = isAndroid
          ? `textContains("${substringForContains}")`
          : `label CONTAINS "${substringForContains}"`;
        return this.locator({
          selector: selector,
          findStrategy: isAndroid
            ? "-android uiautomator"
            : "-ios predicate string",
          textToMatch: text,
        });
      }
    }
    let path: string;
    if (isAndroid) {
      path = exact ? `text("${text}")` : `textContains("${text}")`;
    } else {
      path = exact ? `label == "${text}"` : `label CONTAINS "${text}"`;
    }
    return this.locator({
      selector: path,
      findStrategy: isAndroid
        ? "-android uiautomator"
        : "-ios predicate string",
      textToMatch: text,
    });
  }

  /**
   * Locate an element on the screen with accessibility identifier. This method defaults to
   * a substring match, and this can be overridden by setting the `exact` option to `true`.
   *
   * **Usage:**
   * ```js
   * const element = await device.getById("signup_button");
   * ```
   *
   * @param text string to search for
   * @param options
   * @returns
   */
  getById(
    text: string,
    { exact = false }: { exact?: boolean } = {},
  ): AppwrightLocator {
    const isAndroid = this.getPlatform() == Platform.ANDROID;
    let path: string;
    if (isAndroid) {
      path = exact ? `resourceId("${text}")` : `resourceIdMatches("${text}")`;
    } else {
      path = exact ? `name == "${text}"` : `name CONTAINS "${text}"`;
    }
    return this.locator({
      selector: path,
      findStrategy: isAndroid
        ? "-android uiautomator"
        : "-ios predicate string",
      textToMatch: text,
    });
  }

  /**
   * Locate an element on the screen with xpath.
   *
   * **Usage:**
   * ```js
   * const element = await device.getByXpath(`//android.widget.Button[@text="Confirm"]`);
   * ```
   *
   * @param xpath xpath to locate the element
   * @returns
   */
  getByXpath(xpath: string): AppwrightLocator {
    return this.locator({ selector: xpath, findStrategy: "xpath" });
  }

  /**
   * Helper method to detect the mobile OS running on the device.
   *
   * **Usage:**
   * ```js
   * const platform = device.getPlatform();
   * ```
   *
   * @returns "android" or "ios"
   */
  getPlatform(): Platform {
    const isAndroid = this.webDriverClient.isAndroid;
    return isAndroid ? Platform.ANDROID : Platform.IOS;
  }

  @boxedStep
  async terminateApp(bundleId?: string) {
    if (!this.bundleId && !bundleId) {
      throw new Error("bundleId is required to terminate the app.");
    }
    const keyName =
      this.getPlatform() == Platform.ANDROID ? "appId" : "bundleId";
    await this.webDriverClient.executeScript("mobile: terminateApp", [
      {
        [keyName]: bundleId || this.bundleId,
      },
    ]);
  }

  @boxedStep
  async activateApp(bundleId?: string) {
    if (!this.bundleId && !bundleId) {
      throw new Error("bundleId is required to activate the app.");
    }
    const keyName =
      this.getPlatform() == Platform.ANDROID ? "appId" : "bundleId";
    await this.webDriverClient.executeScript("mobile: activateApp", [
      {
        [keyName]: bundleId || this.bundleId,
      },
    ]);
  }

  /**
   * Retrieves text content from the clipboard of the mobile device. This is useful
   * after a "copy to clipboard" action has been performed. This returns base64 encoded string.
   *
   * **Usage:**
   * ```js
   * const clipboardText = await device.getClipboardText();
   * ```
   *
   * @returns Returns the text content of the clipboard in base64 encoded string.
   */
  @boxedStep
  async getClipboardText(): Promise<string> {
    if (this.getPlatform() == Platform.ANDROID) {
      return await this.webDriverClient.getClipboard();
    } else {
      if (this.provider == "emulator") {
        // iOS simulator supports clipboard sharing
        return await this.webDriverClient.getClipboard();
      } else {
        if (!this.bundleId) {
          throw new Error(
            "bundleId is required to retrieve clipboard data on a real device.",
          );
        }
        await this.activateApp("com.facebook.WebDriverAgentRunner.xctrunner");
        const clipboardDataBase64 = await this.webDriverClient.getClipboard();
        await this.activateApp(this.bundleId);
        return clipboardDataBase64;
      }
    }
  }

  /**
   * Sets a mock camera view using the specified image. This injects a mock image into the camera view.
   * Currently, this functionality is supported only for BrowserStack.
   *
   * **Usage:**
   * ```js
   * await device.setMockCameraView(`screenshot.png`);
   * ```
   *
   * @param imagePath path to the image file that will be used as the mock camera view.
   * @returns
   */
  @boxedStep
  async setMockCameraView(imagePath: string): Promise<void> {
    if (this.provider == "browserstack") {
      const imageURL = await uploadImageToBS(imagePath);
      await this.webDriverClient.executeScript(
        `browserstack_executor: {"action":"cameraImageInjection", "arguments": {"imageUrl" : "${imageURL}"}}`,
        [],
      );
    } else if (this.provider == "lambdatest") {
      const imageURL = await uploadImageToLambdaTest(imagePath);
      await this.webDriverClient.executeScript(
        `lambda-image-injection=${imageURL}`,
        [],
      );
    }
  }

  @boxedStep
  async pause() {
    const skipPause = process.env.CI === "true";
    if (skipPause) {
      return;
    }
    logger.log(`device.pause: Use Appium Inspector to attach to the session.`);
    let iterations = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      await this.webDriverClient.takeScreenshot();
      iterations += 1;
      if (iterations % 3 === 0) {
        logger.log(`device.pause: ${iterations * 20} secs elapsed.`);
      }
    }
  }

  @boxedStep
  async waitForTimeout(timeout: number) {
    await new Promise((resolve) => setTimeout(resolve, timeout));
  }

  /**
   * Get a screenshot of the current screen as a base64 encoded string.
   */
  @boxedStep
  async screenshot(): Promise<string> {
    return await this.webDriverClient.takeScreenshot();
  }

  /**
   * [iOS Only]
   * Scroll the screen from 0.2 to 0.8 of the screen height.
   * This can be used for controlled scroll, for auto scroll checkout `scroll` method from locator.
   *
   * **Usage:**
   * ```js
   * await device.scroll();
   * ```
   *
   */
  @boxedStep
  async scroll(): Promise<void> {
    const driverSize = await this.webDriverClient.getWindowRect();
    // Scrolls from 0.8 to 0.2 of the screen height
    const from = { x: driverSize.width / 2, y: driverSize.height * 0.8 };
    const to = { x: driverSize.width / 2, y: driverSize.height * 0.2 };
    await this.webDriverClient.executeScript("mobile: dragFromToForDuration", [
      { duration: 2, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y },
    ]);
  }

  /**
   * Send keys to already focused input field.
   * To fill input fields using the selectors use `sendKeyStrokes` method from locator
   */
  @boxedStep
  async sendKeyStrokes(value: string): Promise<void> {
    const actions = value
      .split("")
      .map((char) => [
        { type: "keyDown", value: char },
        { type: "keyUp", value: char },
      ])
      .flat();

    await this.webDriverClient.performActions([
      {
        type: "key",
        id: "keyboard",
        actions: actions,
      },
    ]);

    await this.webDriverClient.releaseActions();
  }
}
