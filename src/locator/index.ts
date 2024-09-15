// @ts-ignore
import { Client } from "webdriver";
import {
  WaitUntilOptions,
  WebdriverErrors,
} from "../providers/driver/types/base";
import retry from "async-retry";

export interface AppwrightLocator {
  getPath(): string;
  fill(value: string, options?: { timeout?: number }): Promise<void>;
  isElementVisibleWithinTimeout(options?: WaitUntilOptions): Promise<boolean>;
  click(options?: WaitUntilOptions): Promise<void>;
}

export class Locator {
  constructor(
    private driver: Client,
    private path: string,
  ) {}

  getPath() {
    return this.path;
  }

  async fill(value: string, options?: { timeout?: number }): Promise<void> {
    const isElementDisplayed = await this.isElementVisibleWithinTimeout({
      timeout: options?.timeout,
    });
    if (isElementDisplayed) {
      const element = await this.driver.findElement("xpath", this.path);
      await this.driver.elementSendKeys(
        element["element-6066-11e4-a52e-4f735466cecf"],
        value,
      );
    } else {
      throw new Error(`Element with path "${this.path}" not visible`);
    }
  }

  async isElementVisibleWithinTimeout(
    options?: WaitUntilOptions,
  ): Promise<boolean> {
    try {
      const isVisible = await this.waitUntil(
        async () => {
          try {
            const element = await this.driver.findElement("xpath", this.path);
            if (element && element["element-6066-11e4-a52e-4f735466cecf"]) {
              const isDisplayed = await this.driver.isElementDisplayed(
                element["element-6066-11e4-a52e-4f735466cecf"],
              );
              return isDisplayed;
            } else {
              return false;
            }
          } catch (error) {
            if (
              //@ts-ignore
              error.name.includes(WebdriverErrors.StaleElementReferenceError)
            ) {
              console.log(`Stale element detected. Error: ${error}`);
              throw error;
            }
            console.log(
              `Error while checking visibility of element with path "${this.path}": ${error}`,
            );
            return false;
          }
        },
        {
          timeout: options?.timeout,
          interval: options?.interval,
          timeoutMsg: options?.timeoutMsg,
        },
      );

      return isVisible;
    } catch (error) {
      console.log(
        `Error or timeout occurred while waiting for element: ${error}`,
      );
      return false;
    }
  }

  private async waitUntil<ReturnValue>(
    condition: () => ReturnValue | Promise<ReturnValue>,
    options?: WaitUntilOptions,
  ): Promise<Exclude<ReturnValue, boolean>> {
    if (typeof condition !== "function") {
      throw new Error("Condition is not a function");
    }

    const fn = condition.bind(this.driver);

    try {
      return await retry(
        async () => {
          const result = await fn();

          if (result === false) {
            throw new Error(
              `Element corresponding to path ${this.path} not found yet, Retrying...`,
            );
          }

          return result as Exclude<ReturnValue, boolean>; // Return the result if valid
        },
        {
          maxTimeout: options?.timeout,
          factor: 1,
          onRetry: (err, attempt) => {
            console.log(`Attempt ${attempt} failed: ${err.message}`);
          },
        },
      );
      //@ts-ignore
    } catch (e: Error) {
      if (e.message === "timeout") {
        if (typeof options?.timeoutMsg === "string") {
          throw new Error(`Timeout Error: ${options.timeoutMsg}`);
        }
        throw new Error(
          `waitUntil condition timed out after ${options?.timeout}ms`,
        );
      }

      throw new Error(
        `waitUntil condition failed with the following reason: ${(e && e.message) || e}`,
      );
    }
  }

  async click(options?: WaitUntilOptions) {
    try {
      await this.isElementVisibleWithinTimeout(options);
      const button = await this.driver.findElement("xpath", this.path);
      await this.driver.elementClick(
        button["element-6066-11e4-a52e-4f735466cecf"],
      );
    } catch (error) {
      throw new Error(
        `Failed to click on the element with path "${this.path}": ${error}`,
      );
    }
  }
}
