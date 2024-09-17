// @ts-ignore ts not able to identify the import is just an interface
import type { Client } from "webdriver";
import { test } from "./../../../fixture";
import { IAppwrightDriver, WaitUntilOptions } from "../types/base";
import { AppwrightLocator, Locator } from "../../../locator";

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
  ) {
    this.client = webdriverClient;
  }

  @boxedStep
  async fill(
    path: string,
    value: string,
    options?: { timeout?: number },
  ): Promise<void> {
    await this.locator(path).fill(value, options);
  }

  // TODO: need to check if we need boxedStep
  locator(path: string): AppwrightLocator {
    return new Locator(
      this.client,
      path,
      this.isAndroid() ? "-android uiautomator" : "-ios predicate string",
    );
  }

  async isVisible(path: string, options?: WaitUntilOptions): Promise<boolean> {
    return this.locator(path).isVisible(options);
  }

  @boxedStep
  async close() {
    ///Remove this later or move it inside device
    await this.client.deleteSession();
  }

  @boxedStep
  async click(path: string, options?: WaitUntilOptions) {
    await this.locator(path).click(options);
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
    return this.locator(selector);
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
    return this.locator(selector);
  }

  isAndroid() {
    return this.client.isAndroid;
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
