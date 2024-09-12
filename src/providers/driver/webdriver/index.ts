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
  constructor(webdriverClient: Client) {
    this.client = webdriverClient;
  }

  @boxedStep
  async fill(
    path: string,
    value: string,
    options?: { timeout?: number },
  ): Promise<void> {
    await new Locator(this.client, path).fill(value, options);
  }

  // TODO: need to check if we need boxedStep
  locator(path: string): AppwrightLocator {
    return new Locator(this.client, path);
  }

  async isElementVisibleWithinTimeout(
    path: string,
    options?: WaitUntilOptions,
  ): Promise<boolean> {
    return new Locator(this.client, path).isElementVisibleWithinTimeout(
      options,
    );
  }

  @boxedStep
  async close() {
    ///Remove this later or move it inside device
    await this.client.deleteSession();
  }

  @boxedStep
  async click(path: string, options?: WaitUntilOptions) {
    await new Locator(this.client, path).click(options);
  }

  @boxedStep
  async tapAtGivenCoordinates({ x, y }: { x: number; y: number }) {
    if (this.client.isAndroid) {
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

  isAndroid() {
    return this.client.isAndroid;
  }

  async getClipboard(): Promise<string> {
    return await this.client.getClipboard();
  }
}
