// @ts-ignore ts not able to identify the import is just an interface
import type { Client } from "webdriver";
import { test } from "./../../../fixture";
import { AppwrightLocator, Locator } from "../../../locator";
import { IAppwrightDriver, TestInfoOptions } from "../../../types";
import { AppwrightVision, VisionProvider } from "../../vision";

export function boxedStep(
  target: Function,
  context: ClassMethodDecoratorContext,
) {
  return function replacementMethod(...args: any) {
    const name =
      (context.name as string) +
      "(" +
      Array.from(args)
        .map((a) => JSON.stringify(a))
        .join(" , ") +
      ")";
    return test.step(
      name,
      async () => {
        // @ts-ignore
        return await target.call(this, ...args);
      },
      { box: true },
    ); // Note the "box" option here.
  };
}

export class AppwrightDriver implements IAppwrightDriver {
  private client: Client;
  constructor(
    webdriverClient: Client,
    private bundleId: string,
    private testOptions: TestInfoOptions,
  ) {
    this.client = webdriverClient;
  }

  // TODO: need to check if we need boxedStep
  locator(path: string, findStrategy: string): AppwrightLocator {
    return new Locator(this.client, path, findStrategy, this.testOptions);
  }

  private vision(): AppwrightVision {
    return new VisionProvider(this.client, this);
  }

  async tapWithPrompt(prompt: string): Promise<void> {
    await this.vision().tapWithPrompt(prompt);
  }

  async extractTextWithPrompt(prompt: string): Promise<string> {
    return await this.vision().extractTextWithPrompt(prompt);
  }

  @boxedStep
  async close() {
    ///Remove this later or move it inside device
    await this.client.deleteSession();
  }

  @boxedStep
  async tapAtGivenCoordinates({ x, y }: { x: number; y: number }) {
    if (this.isAndroid()) {
      await this.client.executeScript("mobile: clickGesture", [
        {
          x: x,
          y: y,
          duration: 100,
          tapCount: 1,
        },
      ]);
    } else {
      await this.client.executeScript("mobile: tap", [
        {
          x: x,
          y: y,
        },
      ]);
    }
  }

  getByText(
    text: string,
    { exact = false }: { exact?: boolean } = {},
  ): AppwrightLocator {
    const isAndroid = this.isAndroid();
    let selector: string;
    if (isAndroid) {
      selector = exact ? `text("${text}")` : `textContains("${text}")`;
    } else {
      selector = exact ? `label == "${text}"` : `label CONTAINS "${text}"`;
    }
    return this.locator(
      selector,
      isAndroid ? "-android uiautomator" : "-ios predicate string",
    );
  }

  getById(
    text: string,
    { exact = false }: { exact?: boolean } = {},
  ): AppwrightLocator {
    const isAndroid = this.isAndroid();
    let selector: string;
    if (isAndroid) {
      selector = exact
        ? `resourceId("${text}")`
        : `resourceIdMatches(".*${text}.*")`;
    } else {
      selector = exact ? `name == "${text}"` : `name CONTAINS "${text}"`;
    }
    return this.locator(
      selector,
      isAndroid ? "-android uiautomator" : "-ios predicate string",
    );
  }

  getByXpath(xpath: string): AppwrightLocator {
    return this.locator(xpath, "xpath");
  }

  isAndroid() {
    return this.client.isAndroid;
  }

  async hideKeyboard() {
    await this.client.hideKeyboard();
  }

  async getClipboard(): Promise<string> {
    if (this.isAndroid()) {
      return await this.client.getClipboard();
    } else {
      await this.client.executeScript("mobile: activateApp", [
        {
          bundleId: "com.facebook.WebDriverAgentRunner.xctrunner",
        },
      ]);
      const clipboardDataBase64 = await this.client.getClipboard();
      await this.client.executeScript("mobile: activateApp", [
        {
          bundleId: this.bundleId,
        },
      ]);
      return clipboardDataBase64;
    }
  }
}
