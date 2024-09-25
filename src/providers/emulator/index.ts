import {
  AppwrightConfig,
  DeviceProvider,
  EmulatorConfig,
  Platform,
  TestInfoOptions,
} from "../../types";
// @ts-ignore ts not able to identify the import is just an interface
import { Device } from "../../device";
import { startAppiumServer } from "../appium";
import { FullProject } from "@playwright/test";

export class EmulatorProvider implements DeviceProvider {
  private config: any;

  constructor(private project: FullProject<AppwrightConfig>) {}

  async globalSetup() {}

  async getDevice(): Promise<Device> {
    this.createConfig();
    return await this.createDriver();
  }

  private async createDriver(): Promise<Device> {
    await startAppiumServer();
    const WebDriver = (await import("webdriver")).default;
    const webDriverClient = await WebDriver.newSession(this.config as any);
    //TODO: get bundle id
    // const bundleId = await this.getAppBundleId();
    //@ts-ignore
    const expectTimeout = this.project.use.expectTimeout!;
    const testOptions: TestInfoOptions = {
      expectTimeout,
    };
    return new Device(webDriverClient, "", testOptions);
  }

  async downloadVideo(): Promise<{
    path: string;
    contentType: string;
  } | null> {
    return null;
  }

  async syncTestDetails() {}

  private createConfig() {
    const platformName = this.project.use.platform;
    this.config = {
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
      },
    };
  }
}
