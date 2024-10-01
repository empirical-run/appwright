// @ts-ignore ts not able to identify the import is just an interface
import type { Client as WebDriverClient } from "webdriver";
import { Locator } from "../locator";
import { AppwrightLocator, Platform, TestInfoOptions } from "../types";
import { AppwrightVision, VisionProvider } from "../vision";
import { boxedStep } from "../utils";
import { uploadImageToBS } from "../providers/browserstack/utils";

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

    extractText: async (prompt: string): Promise<string> => {
      return await this.vision().extractText(prompt);
    },
  };

  /**
   * Closes the automation session. This is called automatically after each test.
   */
  @boxedStep
  async close() {
    await this.webdriverClient.deleteSession();
  }

  /**
   * Tap on the screen at the given coordinates, specified as x and y. The top left corner
   * of the screen is { x: 0, y: 0 }.
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

  getByXpath(xpath: string): AppwrightLocator {
    return this.locator(xpath, "xpath");
  }

  /**
   * Helper method to detect the mobile OS running on the device.
   * @returns "android" or "ios"
   */
  getPlatform(): Platform {
    const isAndroid = this.webdriverClient.isAndroid;
    return isAndroid ? Platform.ANDROID : Platform.IOS;
  }

  /**
   * Retrieves text content from the clipboard of the mobile device. This is useful
   * after a "copy to clipboard" action has been performed.
   *
   * @returns Returns the text content of the clipboard.
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

  async mockCameraView(imagePath: string): Promise<void> {
    if (this.provider == "browserstack") {
      const imageURL = await uploadImageToBS(imagePath);
      await this.webdriverClient.executeScript(
        `browserstack_executor: {"action":"cameraImageInjection", "arguments": {"imageUrl" : "${imageURL}"}}`,
        [],
      );
    }
  }
}
