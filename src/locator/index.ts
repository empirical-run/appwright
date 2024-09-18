// @ts-ignore
import { Client } from "webdriver";
import retry from "async-retry";
import test from "@playwright/test";
import { TestInfoOptions, WaitUntilOptions, WebdriverErrors } from "../types";

export function boxedStep(
  target: Function,
  context: ClassMethodDecoratorContext,
) {
  return function replacementMethod(...args: any) {
    //@ts-ignore
    const path = this.path;
    const argsString = args.length
      ? "(" +
        Array.from(args)
          .map((a) => JSON.stringify(a))
          .join(" , ") +
        ")"
      : "";
    const name = `${context.name as string}("${path}")${argsString}`;
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

export interface AppwrightLocator {
  getSelector(): string;
  fill(value: string, options?: { timeout?: number }): Promise<void>;
  isVisible(options?: WaitUntilOptions): Promise<boolean>;
  click(options?: WaitUntilOptions): Promise<void>;
}

export class Locator {
  constructor(
    private driver: Client,
    private path: string,
    private findStrategy: string,
    private testOptions: TestInfoOptions,
  ) {}

  getSelector() {
    return this.path;
  }

  @boxedStep
  async fill(value: string, options?: WaitUntilOptions): Promise<void> {
    const isElementDisplayed = await this.isVisible(options);
    if (isElementDisplayed) {
      const element = await this.driver.findElement(
        this.findStrategy,
        this.path,
      );
      await this.driver.elementSendKeys(
        element["element-6066-11e4-a52e-4f735466cecf"],
        value,
      );
    } else {
      throw new Error(`Element with path "${this.path}" not visible`);
    }
  }

  async isVisible(options?: WaitUntilOptions): Promise<boolean> {
    const timeout = this.testOptions.expectTimeout;
    try {
      const isVisible = await this.waitUntil(
        async () => {
          try {
            const element = await this.driver.findElement(
              this.findStrategy,
              this.path,
            );
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
          timeout: timeout,
          ...options,
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

  @boxedStep
  async click(options?: WaitUntilOptions) {
    try {
      await this.isVisible(options);
      const button = await this.driver.findElement(
        this.findStrategy,
        this.path,
      );
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
