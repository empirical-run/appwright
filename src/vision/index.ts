import { getBoundingBox, query } from "@empiricalrun/llm/vision";
// @ts-ignore ts not able to identify the import is just an interface
import { Client as WebDriverClient } from "webdriver";
import { Device } from "../device";
import test from "@playwright/test";

export interface AppwrightVision {
  /**
   * Extracts text from the screenshot based on the specified prompt.
   * Ensure the `OPENAI_API_KEY` environment variable is set to authenticate the API request.
   *
   * **Usage:**
   * ```js
   * await device.beta.extractText("Extract contact details present in the footer from the screenshot");
   * ```
   *
   * @param prompt that defines the specific area or context from which text should be extracted.
   * @returns
   */
  extractText(prompt: string): Promise<string>;

  /**
   * Performs a tap action on the screen based on the provided prompt.
   * Ensure the `GOOGLE_API_KEY` environment variable is set to authenticate the API request.
   *
   * **Usage:**
   * ```js
   * await device.beta.tap("Tap on the search button");
   * ```
   *
   * @param prompt that defines where on the screen the tap action should occur
   */
  tap(prompt: string): Promise<void>;
}

export class VisionProvider {
  constructor(
    private device: Device,
    private webDriverClient: WebDriverClient,
  ) {}

  async extractText(prompt: string): Promise<string> {
    test.skip(
      !process.env.OPENAI_API_KEY,
      "LLM vision based extract text is not enabled. Set the OPENAI_API_KEY environment variable to enable it",
    );
    const base64Screenshot = await this.webDriverClient.takeScreenshot();
    return await query(base64Screenshot, prompt);
  }

  async tap(prompt: string): Promise<void> {
    test.skip(
      !process.env.GOOGLE_API_KEY,
      "LLM vision based tap is not enabled. Set the GOOGLE_API_KEY environment variable to enable it",
    );
    const base64Screenshot = await this.webDriverClient.takeScreenshot();
    const { center, container: imageSize } = await getBoundingBox(
      base64Screenshot,
      prompt,
    );

    const driverSize = await this.webDriverClient.getWindowRect();
    const scaleFactorWidth = imageSize.width / driverSize.width;
    const scaleFactorHeight = imageSize.height / driverSize.height;
    if (scaleFactorWidth !== scaleFactorHeight) {
      console.warn(
        `Scale factors are different: ${scaleFactorWidth} vs ${scaleFactorHeight}`,
      );
    }
    await this.device.tap({
      x: center.x / scaleFactorWidth,
      y: center.y / scaleFactorWidth,
    });
  }
}
