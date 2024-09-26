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
import { getAppBundleId, startAppiumServer } from "../appium";

export class LocalDeviceProvider implements DeviceProvider {
  constructor(private project: FullProject<AppwrightConfig>) {}

  async getDevice(): Promise<Device> {
    this.validateConfig();
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
    const webDriverClient = await WebDriver.newSession(this.createConfig());
    const bundleId = await getAppBundleId(this.project.use.buildPath!);
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

  private createConfig() {
    const platformName = this.project.use.platform;
    return {
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
