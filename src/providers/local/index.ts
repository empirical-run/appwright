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
  getActiveAndroidDevices,
  getApkDetails,
  getAppBundleId,
  getConnectedIOSDeviceUDID,
  installDriver,
  startAppiumServer,
} from "../appium";
import { validateBuildPath } from "../../utils";
import { logger } from "../../logger";

export class LocalDeviceProvider implements DeviceProvider {
  constructor(
    private project: FullProject<AppwrightConfig>,
    appBundleId: string | undefined,
  ) {
    if (appBundleId) {
      console.log(
        `Bundle id is specified (${appBundleId}) but ignored for local device provider.`,
      );
    }
  }

  async getDevice(): Promise<Device> {
    return await this.createDriver();
  }

  async globalSetup() {
    validateBuildPath(
      this.project.use.buildPath,
      this.project.use.platform == Platform.ANDROID ? ".apk" : ".ipa",
    );
    if (this.project.use.platform == Platform.ANDROID) {
      const androidHome = process.env.ANDROID_HOME;

      if (!androidHome) {
        return Promise.reject(
          "The ANDROID_HOME environment variable is not set. This variable is required to locate your Android SDK. Please set it to the correct path of your Android SDK installation. For detailed instructions on how to set up the Android SDK path, visit: https://developer.android.com/tools",
        );
      }
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
    let udid = (this.project.use.device as LocalDeviceConfig).udid;
    if (!udid) {
      if (platformName == Platform.IOS) {
        udid = await getConnectedIOSDeviceUDID();
      } else {
        const activeAndroidDevices = await getActiveAndroidDevices();
        if (activeAndroidDevices > 1) {
          logger.warn(
            `Multiple active devices detected. Selecting one for the test. 
To specify a device, use the udid property. Run "adb devices" to get the UDID for active devices.`,
          );
        }
      }
    }
    return {
      port: 4723,
      capabilities: {
        "appium:deviceName": this.project.use.device?.name,
        "appium:udid": udid,
        "appium:automationName":
          platformName == Platform.ANDROID ? "uiautomator2" : "xcuitest",
        platformName: platformName,
        "appium:autoGrantPermissions": true,
        "appium:app": this.project.use.buildPath,
        "appium:appActivity": appLaunchableActivity,
        "appium:appPackage": appPackageName,
        "appium:autoAcceptAlerts": true,
        "appium:fullReset": true,
        "appium:deviceOrientation": this.project.use.device?.orientation,
      },
    };
  }
}
