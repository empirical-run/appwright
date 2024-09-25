import {
  AppwrightConfig,
  DeviceProvider,
  LocalDeviceConfig,
  Platform,
  TestInfoOptions,
} from "../../types";
// @ts-ignore ts not able to identify the import is just an interface
import { Device } from "../../device";
import { FullProject } from "@playwright/test";
import { startAppiumServer } from "../appium";

export class LocalDeviceProvider implements DeviceProvider {
  private config: any;

  constructor(private project: FullProject<AppwrightConfig>) {}

  async globalSetup() {}

  async getDevice(): Promise<Device> {
    this.validateConfig();
    this.createConfig();
    return await this.createDriver();
  }

  private validateConfig() {
    const device = (this.project.use as AppwrightConfig)
      .device as LocalDeviceConfig;
    if (!device.udid) {
      throw new Error("UDID is required for running tests on real devices");
    }
  }

  private async createDriver(): Promise<Device> {
    await startAppiumServer(this.project.use.device?.provider!);
    const WebDriver = (await import("webdriver")).default;
    const webDriverClient = await WebDriver.newSession(this.config as any);
    //TODO: Add bundle id implementation
    const bundleId = "";
    const expectTimeout = this.project.use.expectTimeout!;
    const testOptions: TestInfoOptions = {
      expectTimeout,
    };
    return new Device(
      webDriverClient,
      bundleId,
      testOptions,
      this.project.use.device?.provider!,
    );
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
        "appium:udid": (this.project.use.device as LocalDeviceConfig).udid,
        "appium:automationName":
          platformName == Platform.ANDROID ? "uiautomator2" : "xcuitest",
        platformName: platformName,
        "appium:autoGrantPermissions": true,
        "appium:app": this.project.use.buildPath,
        "appium:autoAcceptAlerts": true,
        "appium:fullReset": true,
      },
    };
  }
}
