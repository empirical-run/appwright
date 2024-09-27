import {
  AppwrightConfig,
  DeviceProvider,
  LocalDeviceConfig,
  Platform,
  TestInfoOptions,
} from "../../types";
import { Device } from "../../device";
import { FullProject } from "@playwright/test";
import {
  getAppBundleId,
  installDriver,
  isDriverInstalled,
  isEmulatorInstalled,
  startAppiumServer,
} from "../appium";

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

  async globalSetup() {
    if (this.project.use.platform == Platform.ANDROID) {
      const androidHome = process.env.ANDROID_HOME;

      if (!androidHome) {
        return Promise.reject(
          "The ANDROID_HOME environment variable is not set. This variable is required to locate your Android SDK. Please set it to the correct path of your Android SDK installation. For detailed instructions on how to set up the Android SDK path, visit: https://developer.android.com/tools",
        );
      }

      await isEmulatorInstalled(this.project.use.platform);

      ///check for driver in appium i.e. android and iOS
      const isuiAutomatorInstalled = await isDriverInstalled("uiautomator2");
      if (!isuiAutomatorInstalled) {
        await installDriver("uiautomator2");
      }
    } else {
      const isxcuitestInstalled = await isDriverInstalled("xcuitest");
      if (!isxcuitestInstalled) {
        await installDriver("xcuitest");
      }
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
