// @ts-ignore
import { Client } from "webdriver";
import {
  WaitUntilOptions,
  webdriverErrors,
} from "../providers/driver/types/base";
import retry from "async-retry";
import { TestInfo } from "@playwright/test";

export interface AppwrightLocator {
  getPath(): string;
  fill(value: string, options?: { timeout?: number }): Promise<void>;
  isElementVisibleWithinTimeout(options?: WaitUntilOptions): Promise<boolean>;
  click(options?: WaitUntilOptions): Promise<void>;
}

export class Locator {
  private timeout: number;
  constructor(
    private driver: Client,
    private path: string,
    private testInfo: TestInfo,
  ) {
    // Setting the default timeout to 20 seconds
    this.timeout = this.testInfo.project.use.actionTimeout ?? 20_000;
  }

  getPath() {
    return this.path;
  }

  async fill(value: string, options?: WaitUntilOptions): Promise<void> {
    const isElementDisplayed =
      await this.isElementVisibleWithinTimeout(options);
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
            //@ts-ignore
            if (error.includes(webdriverErrors.StaleElementReferenceError)) {
              console.log(`Stale element detected. Retrying...`);
              throw error;
            }
            console.log(
              `Error while checking visibility of element with path "${this.path}": ${error}`,
            );
            return false;
          }
        },
        options ?? {
          timeout: this.timeout,
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
    options: WaitUntilOptions,
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
          maxRetryTime: options.timeout,
          factor: 1,
          onRetry: (err, attempt) => {
            console.log(`Attempt ${attempt} failed: ${err.message}`);
          },
        },
      );
      //@ts-ignore
    } catch (e: Error) {
      if (e.message === "timeout") {
        throw new Error(
          `waitUntil condition timed out after ${options.timeout}ms`,
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
