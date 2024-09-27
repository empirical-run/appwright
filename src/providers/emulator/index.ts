import {
  AppwrightConfig,
  DeviceProvider,
  EmulatorConfig,
  Platform,
  TestInfoOptions,
} from "../../types";
import { Device } from "../../device";
import {
  installDriver,
  isEmulatorInstalled,
  startAppiumServer,
} from "../appium";
import { FullProject } from "@playwright/test";
import { validateBuildPath } from "../../utils";

export class EmulatorProvider implements DeviceProvider {
  constructor(private project: FullProject<AppwrightConfig>) {}

  async getDevice(): Promise<Device> {
    return await this.createDriver();
  }

  async globalSetup() {
    validateBuildPath(
      this.project.use.buildPath!,
      this.project.use.platform == Platform.ANDROID ? ".apk" : ".app",
    );
    if (this.project.use.platform == Platform.ANDROID) {
      const androidHome = process.env.ANDROID_HOME;

      if (!androidHome) {
        throw new Error(
          `The ANDROID_HOME environment variable is not set. 
This variable is required to locate your Android SDK.
Please set it to the correct path of your Android SDK installation. 
For detailed instructions on how to set up the Android SDK path, visit: https://developer.android.com/tools.`,
        );
      }

      await isEmulatorInstalled(this.project.use.platform);
    }
  }

  private async createDriver(): Promise<Device> {
    await installDriver(
      this.project.use.platform == Platform.ANDROID
        ? "uiautomator2"
        : "xcuitest",
    );
    await startAppiumServer(this.project.use.device?.provider!);
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
        //TODO: Figure out the scenario for multiple activities
        // "appium:appActivity": "org.wikipedia.main.MainActivity",
        // "appium:appPackage": "org.wikipedia",
        platformName: platformName,
        "appium:autoGrantPermissions": true,
        "appium:app": this.project.use.buildPath,
        "appium:autoAcceptAlerts": true,
        "appium:fullReset": true,
      },
    };
  }
}
