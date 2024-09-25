// @ts-ignore
import { Client } from "webdriver";
import { getBoundingBox, query } from "@empiricalrun/llm/vision";
import { AppwrightDriver } from "../driver";

export interface AppwrightVision {
  extractTextWithPrompt(prompt: string): Promise<string>;
  tapWithPrompt(prompt: string): Promise<void>;
}

export class VisionProvider {
  constructor(
    private client: Client,
    private appwrightDriver: AppwrightDriver,
  ) {}

  async extractTextWithPrompt(prompt: string): Promise<string> {
    const base64Screenshot = await this.client.takeScreenshot();
    return await query(base64Screenshot, prompt);
  }

  async tapWithPrompt(prompt: string): Promise<void> {
    const base64Screenshot = await this.client.takeScreenshot();
    const { center, container: imageSize } = await getBoundingBox(
      base64Screenshot,
      prompt,
    );

    const driverSize = await this.client.getWindowRect();
    const scaleFactorWidth = imageSize.width / driverSize.width;
    const scaleFactorHeight = imageSize.height / driverSize.height;
    if (scaleFactorWidth !== scaleFactorHeight) {
      console.warn(
        `Scale factors are different: ${scaleFactorWidth} vs ${scaleFactorHeight}`,
      );
    }
    await this.appwrightDriver.tap({
      x: center.x / scaleFactorWidth,
      y: center.y / scaleFactorWidth,
    });
  }
}
