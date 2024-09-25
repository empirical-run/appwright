// @ts-ignore ts not able to identify the import is just an interface
import type { Client as WebDriverClient } from "webdriver";
import { Locator } from "../locator";
import {
  AppwrightLocator,
  IDevice as IDevice,
  Platform,
  TestInfoOptions,
} from "../types";
import { AppwrightVision, VisionProvider } from "../vision";
import { boxedStep } from "../utils";

export class Device implements IDevice {
  constructor(
    private webdriverClient: WebDriverClient,
    private bundleId: string,
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
  @boxedStep
  async close() {
    await this.webdriverClient.deleteSession();
  }

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

  getPlatform(): Platform {
    const isAndroid = this.webdriverClient.isAndroid;
    return isAndroid ? Platform.ANDROID : Platform.IOS;
  }

  async getClipboardText(): Promise<string> {
    if (this.getPlatform() == Platform.ANDROID) {
      return await this.webdriverClient.getClipboard();
    } else {
      //iOS simulator supports clipboard sharing
      if (this.provider == "emulator") {
        return await this.webdriverClient.getClipboard();
      } else {
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
}
