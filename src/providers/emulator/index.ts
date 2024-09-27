import {
  AppwrightConfig,
  DeviceProvider,
  EmulatorConfig,
  Platform,
  TestInfoOptions,
} from "../../types";
import { Device } from "../../device";
import { startAppiumServer } from "../appium";
import { FullProject } from "@playwright/test";

export class EmulatorProvider implements DeviceProvider {
  constructor(private project: FullProject<AppwrightConfig>) {}

  async getDevice(): Promise<Device> {
    return await this.createDriver();
  }

  private async createDriver(): Promise<Device> {
    await startAppiumServer(
      this.project.use.device?.provider!,
      this.project.use.platform!,
    );
    const WebDriver = (await import("webdriver")).default;
    const webDriverClient = await WebDriver.newSession(this.createConfig());
    const expectTimeout = this.project.use.expectTimeout!;
    const testOptions: TestInfoOptions = {
      expectTimeout,
    };
    return new Device(
      webDriverClient,
      undefined,
      testOptions,
      this.project.use.device?.provider!,
    );
  }

  private createConfig() {
    const platformName = this.project.use.platform;
    return {
      port: 4723,
      capabilities: {
        "appium:deviceName": this.project.use.device?.name,
        "appium:automationName":
          platformName == Platform.ANDROID ? "uiautomator2" : "xcuitest",
        "appium:platformVersion": (this.project.use.device as EmulatorConfig)
          .osVersion,
        platformName: platformName,
        "appium:autoGrantPermissions": true,
        "appium:app": this.project.use.buildPath,
        "appium:autoAcceptAlerts": true,
        "appium:fullReset": true,
      },
    };
  }
}
