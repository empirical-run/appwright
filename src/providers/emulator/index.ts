import {
  AppwrightConfig,
  DeviceProvider,
  EmulatorConfig,
  Platform,
  TimeoutOptions,
} from "../../types";
import { Device } from "../../device";
import {
  getApkDetails,
  installDriver,
  isEmulatorInstalled,
  startAppiumServer,
} from "../appium";
import { FullProject } from "@playwright/test";
import { validateBuildPath } from "../../utils";

export class EmulatorProvider implements DeviceProvider {
  sessionId?: string;

  constructor(
    private project: FullProject<AppwrightConfig>,
    appBundleId: string | undefined,
  ) {
    if (appBundleId) {
      console.log(
        `Bundle id is specified (${appBundleId}) but ignored for Emulator provider.`,
      );
    }
  }

  async getDevice(): Promise<Device> {
    return await this.createDriver();
  }

  async globalSetup() {
    validateBuildPath(
      this.project.use.buildPath,
      this.project.use.platform == Platform.ANDROID ? ".apk" : ".app",
    );
    if (this.project.use.platform == Platform.ANDROID) {
      const androidHome = process.env.ANDROID_HOME;
      const androidSimulatorConfigDocLink =
        "https://github.com/empirical-run/appwright/blob/main/docs/config.md#android-emulator";
      if (!androidHome) {
        throw new Error(
          `The ANDROID_HOME environment variable is not set. 
This variable is required to locate your Android SDK.
Please set it to the correct path of your Android SDK installation. 
Follow the steps mentioned in ${androidSimulatorConfigDocLink} to run test on Android emulator.`,
        );
      }

      const javaHome = process.env.JAVA_HOME;
      if (!javaHome) {
        throw new Error(
          `The JAVA_HOME environment variable is not set.  
Follow the steps mentioned in ${androidSimulatorConfigDocLink} to run test on Android emulator.`,
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
    const webDriverClient = await WebDriver.newSession(
      await this.createConfig(),
    );
    this.sessionId = webDriverClient.sessionId;
    const expectTimeout = this.project.use.expectTimeout!;
    const testOptions: TimeoutOptions = {
      expectTimeout,
    };
    return new Device(
      webDriverClient,
      undefined,
      testOptions,
      this.project.use.device?.provider!,
    );
  }

  private async createConfig() {
    const platformName = this.project.use.platform;
    let appPackageName: string | undefined;
    let appLaunchableActivity: string | undefined;

    if (platformName == Platform.ANDROID) {
      const { packageName, launchableActivity } = await getApkDetails(
        this.project.use.buildPath!,
      );
      appPackageName = packageName!;
      appLaunchableActivity = launchableActivity!;
    }
    return {
      port: 4723,
      capabilities: {
        "appium:deviceName": this.project.use.device?.name,
        "appium:automationName":
          platformName == Platform.ANDROID ? "uiautomator2" : "xcuitest",
        "appium:platformVersion": (this.project.use.device as EmulatorConfig)
          .osVersion,
        "appium:appActivity": appLaunchableActivity,
        "appium:appPackage": appPackageName,
        platformName: platformName,
        "appium:autoGrantPermissions": true,
        "appium:app": this.project.use.buildPath,
        "appium:autoAcceptAlerts": true,
        "appium:fullReset": true,
        "appium:deviceOrientation": this.project.use.device?.orientation,
      },
    };
  }
}
