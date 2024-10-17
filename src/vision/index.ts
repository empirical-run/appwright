import { query } from "@empiricalrun/llm/vision";
import { getBoundingBox } from "@empiricalrun/llm/vision/bbox";
import fs from "fs";
// @ts-ignore ts not able to identify the import is just an interface
import { Client as WebDriverClient } from "webdriver";
import { Device } from "../device";
import test from "@playwright/test";
import { boxedStep } from "../utils";
import { z } from "zod";
import { LLMModel } from "@empiricalrun/llm";
import { BoundingBox, ExtractType } from "../types";

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
    },
  ): Promise<ExtractType<T>>;

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
  tap(
    prompt: string,
    options?: {
      debug?: boolean;
      focusArea?: BoundingBox;
      verifier?: boolean;
    },
  ): Promise<void>;

  /**
   * Provides a bounding box around the content present in the screenshot based on the specified prompt.
   * Ensure the `GOOGLE_API_KEY` environment variable is set to authenticate the API request.
   *
   * **Usage:**
   * ```js
   * await device.beta.getAnnotatedImage("Give a box around the search button");
   * ```
   * @param prompt
   */
  queryBoundingBox(prompt: string): Promise<BoundingBox>;
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
    },
  ): Promise<ExtractType<T>> {
    test.skip(
      !process.env.OPENAI_API_KEY,
      "LLM vision based extract text is not enabled. Set the OPENAI_API_KEY environment variable to enable it",
    );
    const base64Screenshot = await this.webDriverClient.takeScreenshot();
    return await query(base64Screenshot, prompt, options);
  }

  @boxedStep
  async tap(
    prompt: string,
    options?: {
      debug?: boolean;
      focusArea?: BoundingBox;
      verifier?: boolean;
    },
  ): Promise<void> {
    test.skip(
      !process.env.GOOGLE_API_KEY,
      "LLM vision based tap is not enabled. Set the GOOGLE_API_KEY environment variable to enable it",
    );
    const base64Screenshot = await this.webDriverClient.takeScreenshot();
    const bbox = await getBoundingBox(base64Screenshot, prompt, {
      focusArea: options?.focusArea,
      verifier: options?.verifier,
      debug: options?.debug,
    });
    if (bbox.annotatedImage) {
      const random = Math.floor(1000 + Math.random() * 9000);
      const file = test.info().outputPath(`${random}.png`);
      const base64 = bbox.annotatedImage.split(",")[1];
      await fs.promises.writeFile(file, Buffer.from(base64!, "base64"));
      await test.info().attach(`${random}`, { path: file });
    }
    const driverSize = await this.webDriverClient.getWindowRect();
    const { container: imageSize, center } = bbox;
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

  @boxedStep
  async queryBoundingBox(prompt: string): Promise<BoundingBox> {
    test.skip(
      !process.env.GOOGLE_API_KEY,
      "LLM vision based tap is not enabled. Set the GOOGLE_API_KEY environment variable to enable it",
    );
    const base64Screenshot = await this.webDriverClient.takeScreenshot();
    const bbox = await getBoundingBox(base64Screenshot, prompt);
    return bbox;
  }
}
