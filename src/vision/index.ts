import { getBoundingBox, query } from "@empiricalrun/llm/vision";
// @ts-ignore
import { Client as WebDriverClient } from "webdriver";
import { IDevice } from "../types";

export interface AppwrightVision {
  extractText(prompt: string): Promise<string>;
  tap(prompt: string): Promise<void>;
}

export class VisionProvider {
  constructor(
    private device: IDevice,
    private webDriverClient: WebDriverClient,
  ) {}

  async extractText(prompt: string): Promise<string> {
    const base64Screenshot = await this.webDriverClient.takeScreenshot();
    return await query(base64Screenshot, prompt);
  }

  async tap(prompt: string): Promise<void> {
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
