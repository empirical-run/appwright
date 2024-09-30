// @ts-ignore ts not able to identify the import is just an interface
import { Client as WebDriverClient } from "webdriver";
import retry from "async-retry";
import {
  ElementReference,
  TestInfoOptions,
  WaitUntilOptions,
  WebdriverErrors,
} from "../types";
import { boxedStep } from "../utils";

export class Locator {
  constructor(
    private webDriverClient: WebDriverClient,
    private selector: string | RegExp,
    private findStrategy: string,
    private testOptions: TestInfoOptions,
    private textToMatch?: string,
  ) {}

  @boxedStep
  async fill(value: string, options?: WaitUntilOptions): Promise<void> {
    const isElementDisplayed = await this.isVisible(options);
    if (isElementDisplayed) {
      const element = await this.getElement();
      if (element) {
        await this.webDriverClient.elementSendKeys(
          element["element-6066-11e4-a52e-4f735466cecf"],
          value,
        );
      } else {
        throw new Error(`Element with path "${this.selector}" is not found`);
      }
    } else {
      throw new Error(`Element with path "${this.selector}" not visible`);
    }
  }

  @boxedStep
  async sendKeyStrokes(
    value: string,
    options?: WaitUntilOptions,
  ): Promise<void> {
    const isElementDisplayed = await this.isVisible(options);
    if (isElementDisplayed) {
      const element = await this.getElement();
      if (element) {
        await this.webDriverClient.elementClick(
          element["element-6066-11e4-a52e-4f735466cecf"],
        );
        const actions = value
          .split("")
          .map((char) => [
            { type: "keyDown", value: char },
            { type: "keyUp", value: char },
          ])
          .flat();

        await this.webDriverClient.performActions([
          {
            type: "key",
            id: "keyboard",
            actions: actions,
          },
        ]);

        await this.webDriverClient.releaseActions();
      } else {
        throw new Error(`Element with path "${this.selector}" is not found`);
      }
    } else {
      throw new Error(`Element with path "${this.selector}" not visible`);
    }
  }

  async isVisible(options?: WaitUntilOptions): Promise<boolean> {
    const timeout = this.testOptions.expectTimeout;
    try {
      const isVisible = await this.waitUntil(
        async () => {
          try {
            const element = await this.getElement();
            if (element && element["element-6066-11e4-a52e-4f735466cecf"]) {
              const isDisplayed = await this.webDriverClient.isElementDisplayed(
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
              `Error while checking visibility of element with path "${this.selector}": ${error}`,
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

    const fn = condition.bind(this.webDriverClient);

    try {
      return await retry(
        async () => {
          const result = await fn();

          if (result === false) {
            throw new Error(
              `Element corresponding to path ${this.selector} not found yet, Retrying...`,
            );
          }

          return result as Exclude<ReturnValue, boolean>; // Return the result if valid
        },
        {
          maxRetryTime: options.timeout,
          retries: Math.ceil(options.timeout / 1000),
          factor: 1,
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
  async tap(options?: WaitUntilOptions) {
    try {
      const isElementDisplayed = await this.isVisible(options);
      if (isElementDisplayed) {
        const element = await this.getElement();
        if (element) {
          await this.webDriverClient.elementClick(
            element!["element-6066-11e4-a52e-4f735466cecf"],
          );
        } else {
          throw new Error(`Element with path "${this.selector}" not found`);
        }
      } else {
        throw new Error(`Element with path "${this.selector}" not visible`);
      }
    } catch (error) {
      throw new Error(
        `Failed to click on the element with path "${this.selector}": ${error}`,
      );
    }
  }

  @boxedStep
  async getText(options?: WaitUntilOptions): Promise<string> {
    const isElementDisplayed = await this.isVisible(options);
    if (isElementDisplayed) {
      const element = await this.getElement();
      if (element) {
        return await this.webDriverClient.getElementText(
          element!["element-6066-11e4-a52e-4f735466cecf"],
        );
      } else {
        throw new Error(`Element with path "${this.selector}" is not found`);
      }
    } else {
      throw new Error(`Element with path "${this.selector}" not visible`);
    }
  }

  async getElement(): Promise<ElementReference | null> {
    /**
     * Determine whether `path` is a regex or string, and find elements accordingly.
     *
     * If `path` is a regex:
     * - Iterate through all the elements on the page
     * - Extract text content of each element
     * - Return the first matching element
     *
     * If `path` is a string:
     * - Use `findStrategy` (either XPath, Android UIAutomator, or iOS predicate string) to find elements
     * - Apply regex to clean extra characters from the matched element’s text
     * - Return the first element that matches
     */

    let elements: ElementReference[] = [];
    if (typeof this.selector === "string") {
      elements = await this.webDriverClient.findElements(
        this.findStrategy,
        this.selector,
      );
    } else if (this.selector instanceof RegExp) {
      elements = await this.webDriverClient.findElements("xpath", "//*"); // Get all elements
    }

    // If there is only one element, return it
    if (elements.length === 1) {
      return elements[0]!;
    }

    //If there are multiple elements, we reverse the order since the probability
    //of finding the element is higher at higher depth
    const reversedElements = elements.reverse();
    for (const element of reversedElements) {
      let text = await this.webDriverClient.getElementText(
        element["element-6066-11e4-a52e-4f735466cecf"],
      );

      if (this.findStrategy == "xpath") {
        return element;
      }

      if (this.selector instanceof RegExp && this.selector.test(text)) {
        return element;
      }
      if (
        typeof this.selector === "string" &&
        text.includes(this.textToMatch!)
      ) {
        return element;
      }
    }

    return null;
  }
}
