// @ts-ignore ts not able to identify the import is just an interface
import type { Client as WebDriverClient } from "webdriver";
import { Locator } from "../locator";
import { AppwrightLocator, Platform, TestInfoOptions } from "../types";
import { AppwrightVision, VisionProvider } from "../vision";
import { boxedStep } from "../utils";
import { uploadImageToBS } from "../providers/browserstack/utils";
import { uploadImageToLambdaTest } from "../providers/lambdatest/utils";
import { z } from "zod";
import { LLMModel } from "@empiricalrun/llm";

export class Device {
  constructor(
    private webdriverClient: WebDriverClient,
    private bundleId: string | undefined,
    private testOptions: TestInfoOptions,
    private provider: string,
  ) {}

  locator(
    path: string | RegExp,
    findStrategy: string,
    textToMatch?: string,
  ): AppwrightLocator {
    return new Locator(
      this.webdriverClient,
      path,
      findStrategy,
      this.testOptions,
      textToMatch,
    );
  }

  private vision(): AppwrightVision {
    return new VisionProvider(this, this.webdriverClient);
  }

  beta = {
    tap: async (prompt: string): Promise<void> => {
      await this.vision().tap(prompt);
    },

    query: async <T extends z.ZodType>(
      prompt: string,
      options?: {
        responseFormat?: T;
        model?: LLMModel;
      },
    ): Promise<T> => {
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
  @boxedStep
  async close() {
    await this.webdriverClient.deleteSession();
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
      await this.webdriverClient.executeScript("mobile: clickGesture", [
        {
          x: x,
          y: y,
          duration: 100,
          tapCount: 1,
        },
      ]);
    } else {
      await this.webdriverClient.executeScript("mobile: tap", [
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
      return this.locator(
        text,
        isAndroid ? "-android uiautomator" : "-ios predicate string",
      );
    }
    let path: string;
    if (isAndroid) {
      path = exact ? `text("${text}")` : `textContains("${text}")`;
    } else {
      path = exact ? `label == "${text}"` : `label CONTAINS "${text}"`;
    }
    return this.locator(
      path,
      isAndroid ? "-android uiautomator" : "-ios predicate string",
      text,
    );
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
   * @param text string or regular expression to search for
   * @param options
   * @returns
   */
  getById(
    text: string | RegExp,
    { exact = false }: { exact?: boolean } = {},
  ): AppwrightLocator {
    const isAndroid = this.getPlatform() == Platform.ANDROID;
    if (text instanceof RegExp) {
      return this.locator(
        text,
        isAndroid ? "-android uiautomator" : "-ios predicate string",
      );
    }
    let path: string;
    if (isAndroid) {
      path = exact ? `resourceId("${text}")` : `resourceIdMatches("${text}")`;
    } else {
      path = exact ? `name == "${text}"` : `name CONTAINS "${text}"`;
    }
    return this.locator(
      path,
      isAndroid ? "-android uiautomator" : "-ios predicate string",
      text,
    );
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
    return this.locator(xpath, "xpath");
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
    const isAndroid = this.webdriverClient.isAndroid;
    return isAndroid ? Platform.ANDROID : Platform.IOS;
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
  async getClipboardText(): Promise<string> {
    if (this.getPlatform() == Platform.ANDROID) {
      return await this.webdriverClient.getClipboard();
    } else {
      if (this.provider == "emulator") {
        // iOS simulator supports clipboard sharing
        return await this.webdriverClient.getClipboard();
      } else {
        if (!this.bundleId) {
          throw new Error(
            "bundleId is required to retrieve clipboard data on a real device.",
          );
        }
        await this.webdriverClient.executeScript("mobile: activateApp", [
          {
            bundleId: "com.facebook.WebDriverAgentRunner.xctrunner",
          },
        ]);
        const clipboardDataBase64 = await this.webdriverClient.getClipboard();
        await this.webdriverClient.executeScript("mobile: activateApp", [
          {
            bundleId: this.bundleId,
          },
        ]);
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
  async setMockCameraView(imagePath: string): Promise<void> {
    if (this.provider == "browserstack") {
      const imageURL = await uploadImageToBS(imagePath);
      await this.webdriverClient.executeScript(
        `browserstack_executor: {"action":"cameraImageInjection", "arguments": {"imageUrl" : "${imageURL}"}}`,
        [],
      );
    } else if (this.provider == "lambdatest") {
      const imageURL = await uploadImageToLambdaTest(imagePath);
      await this.webdriverClient.executeScript(
        `lambda-image-injection=${imageURL}`,
        [],
      );
    }
  }
}
