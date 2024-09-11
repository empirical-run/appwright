// @ts-ignore
import { Client } from "webdriver";
import { test } from "../fixture";
import { WaitUntilOptions } from "../providers/driver/types/base";
import Timer from "../providers/driver/webdriver/types/timer";

function boxedStep(target: Function, context: ClassMethodDecoratorContext) {
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

export interface AppwrightLocator {
  getPath(): string;
  fill(value: string, options?: { timeout?: number }): Promise<void>;
  isElementVisibleWithinTimeout(options?: WaitUntilOptions): Promise<boolean>;
  click(options?: WaitUntilOptions): Promise<void>;
}

export class Locator {
  constructor(
    private driver: Client,
    private xpath: string,
  ) {}

  getPath() {
    return this.xpath;
  }

  @boxedStep
  async fill(value: string, options?: { timeout?: number }): Promise<void> {
    const isElementDisplayed = await this.isElementVisibleWithinTimeout({
      timeout: options?.timeout,
    });
    if (isElementDisplayed) {
      const element = await this.driver.findElement("xpath", this.xpath);
      await this.driver.elementSendKeys(
        element["element-6066-11e4-a52e-4f735466cecf"],
        value,
      );
    } else {
      throw new Error(`Element with XPath "${this.xpath}" not visible`);
    }
  }

  @boxedStep
  async isElementVisibleWithinTimeout(
    options?: WaitUntilOptions,
  ): Promise<boolean> {
    try {
      const isVisible = await this.waitUntil(
        async () => {
          try {
            const element = await this.driver.findElement("xpath", this.xpath);
            if (element && element["element-6066-11e4-a52e-4f735466cecf"]) {
              const isDisplayed = await this.driver.isElementDisplayed(
                element["element-6066-11e4-a52e-4f735466cecf"],
              );
              return isDisplayed;
            } else {
              return false;
            }
          } catch (error) {
            // TODO: Handle stale element error
            //stale element reference: The element 'By.xpath: //android.widget.TextView[@text="YOUR PORTFOLIO"]' is not linked to the same object in DOM anymore
            console.log(
              `Error while checking visibility of element with XPath "${this.xpath}": ${error}`,
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
    const timer = new Timer(
      options?.interval ?? 500,
      options?.timeout ?? 5000,
      fn,
      true,
    );

    return (timer as any).catch((e: Error) => {
      if (e.message === "timeout") {
        if (typeof options?.timeoutMsg === "string") {
          throw new Error(options.timeoutMsg);
        }
        throw new Error(
          `waitUntil condition timed out after ${options?.timeout}ms`,
        );
      }

      throw new Error(
        `waitUntil condition failed with the following reason: ${(e && e.message) || e}`,
      );
    });
  }

  @boxedStep
  async click(options?: WaitUntilOptions) {
    try {
      await this.waitUntil(
        async () => {
          const element = await this.driver.findElement("xpath", this.xpath);
          return await this.driver.isElementDisplayed(
            element["element-6066-11e4-a52e-4f735466cecf"],
          );
        },
        {
          timeout: options?.timeout,
          interval: options?.interval,
          timeoutMsg: `Element with XPath "${this.xpath}" not visible within ${options?.timeout}ms`,
        },
      );

      const button = await this.driver.findElement("xpath", this.xpath);
      await this.driver.elementClick(
        button["element-6066-11e4-a52e-4f735466cecf"],
      );
    } catch (error) {
      throw new Error(
        `Failed to click on the element with XPath "${this.xpath}": ${error}`,
      );
    }
  }
}
