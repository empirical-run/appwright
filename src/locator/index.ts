// @ts-ignore ts not able to identify the import is just an interface
import { Client as WebDriverClient } from "webdriver";
import retry from "async-retry";
import {
  ElementReference,
  ScrollDirection,
  TimeoutOptions,
  ActionOptions,
  WebdriverErrors,
} from "../types";
import { boxedStep } from "../utils";
import { RetryableError, TimeoutError } from "../types/errors";

export class Locator {
  constructor(
    private webDriverClient: WebDriverClient,
    private timeoutOpts: TimeoutOptions,
    // Used for find elements request that is sent to Appium server
    private selector: string,
    private findStrategy: string,
    // Used to filter elements received from Appium server
    private textToMatch?: string | RegExp,
  ) {}

  @boxedStep
  async fill(value: string, options?: ActionOptions): Promise<void> {
    const isElementDisplayed = await this.isVisible(options);
    if (isElementDisplayed) {
      const element = await this.getElement();
      if (element) {
        await this.webDriverClient.elementSendKeys(
          element["element-6066-11e4-a52e-4f735466cecf"],
          value,
        );
      } else {
        throw new Error(
          `Failed to fill: Element with path "${this.selector}" is not found`,
        );
      }
    } else {
      throw new Error(
        `Failed to fill: Element with path "${this.selector}" not visible`,
      );
    }
  }

  @boxedStep
  async sendKeyStrokes(value: string, options?: ActionOptions): Promise<void> {
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
        throw new Error(
          `Failed to sendKeyStrokes: Element with path "${this.selector}" is not found`,
        );
      }
    } else {
      throw new Error(
        `Failed to sendKeyStrokes: Element with path "${this.selector}" not visible`,
      );
    }
  }

  async isVisible(options?: ActionOptions): Promise<boolean> {
    const timeoutProjectConfig = this.timeoutOpts.expectTimeout;
    const timeoutOverride = options?.timeout;
    const timeout = timeoutOverride || timeoutProjectConfig;
    try {
      const isVisible = await this.waitUntil(async () => {
        try {
          const element = await this.getElement();
          if (element && element["element-6066-11e4-a52e-4f735466cecf"]) {
            return await this.webDriverClient.isElementDisplayed(
              element["element-6066-11e4-a52e-4f735466cecf"],
            );
          } else {
            return false;
          }
        } catch (error) {
          if (
            //@ts-ignore
            error.name.includes(WebdriverErrors.StaleElementReferenceError)
          ) {
            console.log(`Stale element detected. Error: ${error}`);
            throw new RetryableError(`Stale element detected: ${error}`);
          }
          console.log(`isVisible failed for "${this.selector}": ${error}`);
          return false;
        }
      }, timeout);
      return isVisible;
    } catch (error) {
      if (error instanceof TimeoutError) {
        return false;
      } else {
        throw new Error(`Unknown error in isVisible: ${error}`);
      }
    }
  }

  private async waitUntil<ReturnValue>(
    condition: () => ReturnValue | Promise<ReturnValue>,
    timeout: number,
  ): Promise<Exclude<ReturnValue, boolean>> {
    const fn = condition.bind(this.webDriverClient);
    try {
      return await retry(
        async () => {
          const result = await fn();
          if (result === false) {
            throw new RetryableError(`waitUntil condition returned false.`);
          }
          return result as Exclude<ReturnValue, boolean>;
        },
        {
          maxRetryTime: timeout,
          retries: Math.ceil(timeout / 1000),
          factor: 1,
        },
      );
    } catch (err: unknown) {
      if (err instanceof RetryableError) {
        // Retryable erorr is now a timeout error since we have finished retrying
        throw new TimeoutError(
          `waitUntil condition timed out after ${timeout}ms`,
        );
      } else {
        throw new Error(`Unknown error: ${err}`);
      }
    }
  }

  @boxedStep
  async tap(options?: ActionOptions) {
    const isElementVisible = await this.isVisible(options);
    if (isElementVisible) {
      const element = await this.getElement();
      if (element) {
        await this.webDriverClient.elementClick(
          element!["element-6066-11e4-a52e-4f735466cecf"],
        );
      } else {
        throw new Error(
          `Failed to tap: Element with path "${this.selector}" not found`,
        );
      }
    } else {
      throw new Error(
        `Failed to tap: Element with path "${this.selector}" not visible`,
      );
    }
  }

  @boxedStep
  async getText(options?: ActionOptions): Promise<string> {
    const isElementDisplayed = await this.isVisible(options);
    if (isElementDisplayed) {
      const element = await this.getElement();
      if (element) {
        return await this.webDriverClient.getElementText(
          element!["element-6066-11e4-a52e-4f735466cecf"],
        );
      } else {
        throw new Error(
          `Failed to getText: Element with path "${this.selector}" is not found`,
        );
      }
    } else {
      throw new Error(
        `Failed to getText: Element with path "${this.selector}" not visible`,
      );
    }
  }

  @boxedStep
  async scroll(direction: ScrollDirection) {
    const element = await this.getElement();
    if (!element) {
      throw new Error(
        `Failed to scroll: Element with path "${this.selector}" not found`,
      );
    }
    if (this.webDriverClient.isAndroid) {
      await this.webDriverClient.executeScript("mobile: scrollGesture", [
        {
          elementId: element["element-6066-11e4-a52e-4f735466cecf"],
          direction: direction,
          percent: 1,
        },
      ]);
    } else {
      await this.webDriverClient.executeScript("mobile: scroll", [
        {
          elementId: element["element-6066-11e4-a52e-4f735466cecf"],
          direction: direction,
        },
      ]);
    }
  }

  /**
   * Retrieves the element reference based on the `selector`.
   *
   * @returns
   */
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
    let elements: ElementReference[] = await this.webDriverClient.findElements(
      this.findStrategy,
      this.selector,
    );
    // If there is only one element, return it
    if (elements.length === 1) {
      return elements[0]!;
    }
    // If there are multiple elements, we reverse the order since the probability
    // of finding the element is higher at higher depth
    const reversedElements = elements.reverse();
    for (const element of reversedElements) {
      let elementText = await this.webDriverClient.getElementText(
        element["element-6066-11e4-a52e-4f735466cecf"],
      );
      if (this.textToMatch) {
        if (
          this.textToMatch instanceof RegExp &&
          this.textToMatch.test(elementText)
        ) {
          return element;
        }
        if (
          typeof this.textToMatch === "string" &&
          elementText.includes(this.textToMatch!)
        ) {
          return element;
        }
      } else {
        // This is returned for cases where xpath is findStrategy and we want
        // to return the last element found in the list
        return element;
      }
    }
    return null;
  }
}
