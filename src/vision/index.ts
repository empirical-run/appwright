import { query } from "@empiricalrun/llm/vision";
import { getCoordinatesFor } from "@empiricalrun/llm/vision/point";
import fs from "fs";
// @ts-ignore ts not able to identify the import is just an interface
import { Client as WebDriverClient } from "webdriver";
import { Device } from "../device";
import test from "@playwright/test";
import { boxedStep } from "../utils";
import { z } from "zod";
import { LLMModel } from "@empiricalrun/llm";
import { ExtractType } from "../types";

export interface AppwrightVision {
  /**
   * Extracts text from the screenshot based on the specified prompt.
   * Ensure the `OPENAI_API_KEY` environment variable is set to authenticate the API request.
   *
   * **Usage:**
   * ```js
   * await device.beta.query("Extract contact details present in the footer from the screenshot");
   * ```
   *
   * @param prompt that defines the specific area or context from which text should be extracted.
   * @returns
   */
  query<T extends z.ZodType>(
    prompt: string,
    options?: {
      responseFormat?: T;
      model?: LLMModel;
      screenshot?: string;
    },
  ): Promise<ExtractType<T>>;

  /**
   * Performs a tap action on the screen based on the provided prompt.
   * Ensure the `VISION_MODEL_ENDPOINT` environment variable is set to authenticate the API request.
   *
   * **Usage:**
   * ```js
   * await device.beta.tap("Tap on the search button");
   * ```
   *
   * @param prompt that defines where on the screen the tap action should occur
   */
  tap(prompt: string): Promise<{ x: number; y: number }>;
}

export class VisionProvider {
  constructor(
    private device: Device,
    private webDriverClient: WebDriverClient,
  ) {}

  @boxedStep
  async query<T extends z.ZodType>(
    prompt: string,
    options?: {
      responseFormat?: T;
      model?: LLMModel;
      screenshot?: string;
    },
  ): Promise<ExtractType<T>> {
    test.skip(
      !process.env.OPENAI_API_KEY,
      "LLM vision based extract text is not enabled. Set the OPENAI_API_KEY environment variable to enable it",
    );
    let base64Screenshot = options?.screenshot;
    if (!base64Screenshot) {
      base64Screenshot = await this.webDriverClient.takeScreenshot();
    }
    return await query(base64Screenshot, prompt, options);
  }

  @boxedStep
  async tap(prompt: string): Promise<{ x: number; y: number }> {
    test.skip(
      !process.env.VISION_MODEL_ENDPOINT,
      "LLM vision based tap is not enabled. Set the VISION_MODEL_ENDPOINT environment variable to enable it",
    );
    const base64Image = await this.webDriverClient.takeScreenshot();
    const coordinates = await getCoordinatesFor(prompt, base64Image);
    if (coordinates.annotatedImage) {
      const random = Math.floor(1000 + Math.random() * 9000);
      const file = test.info().outputPath(`${random}.png`);
      await fs.promises.writeFile(
        file,
        Buffer.from(coordinates.annotatedImage!, "base64"),
      );
      await test.info().attach(`${random}`, { path: file });
    }
    const driverSize = await this.webDriverClient.getWindowRect();
    const { container: imageSize, x, y } = coordinates;
    const scaleFactorWidth = imageSize.width / driverSize.width;
    const scaleFactorHeight = imageSize.height / driverSize.height;
    if (scaleFactorWidth !== scaleFactorHeight) {
      console.warn(
        `Scale factors are different: ${scaleFactorWidth} vs ${scaleFactorHeight}`,
      );
    }
    const tapTargetX = x / scaleFactorWidth;
    const tapTargetY = y / scaleFactorHeight;
    await this.device.tap({
      x: tapTargetX,
      y: tapTargetY,
    });
    return { x: tapTargetX, y: tapTargetY };
  }
}
