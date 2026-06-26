import fs from "fs";
import FormData from "form-data";
import path from "path";
import { AppwrightConfig, DeviceProvider, DigitalAiConfig } from "../../types";
import { FullProject } from "@playwright/test";
import { Device } from "../../device";
import { logger } from "../../logger";
import { getAuthHeader } from "./utils";

const envVarKeyForBuild = (projectName: string) =>
  `DIGITALAI_APP_URL_${projectName.toUpperCase()}`;

export class DigitalAiDeviceProvider implements DeviceProvider {
  sessionId?: string;
  private webdriverClient: any;
  private projectName = path.basename(process.cwd());

  constructor(
    private project: FullProject<AppwrightConfig>,
    private appBundleId: string | undefined,
  ) {
    if (!appBundleId) {
      throw new Error(
        "App Bundle ID is required for running tests on Digital.ai Testing. Set the `appBundleId` for your projects that run on this provider.",
      );
    }
  }

  async globalSetup() {
    if (!this.project.use.buildPath) {
      throw new Error(
        `Build path not found. Please set the build path in the config file.`,
      );
    }
    if (
      !process.env.DIGITALAI_ACCESS_KEY ||
      !process.env.DIGITALAI_CLOUD_SERVER
    ) {
      throw new Error(
        "DIGITALAI_ACCESS_KEY and DIGITALAI_CLOUD_SERVER are required environment variables for this device provider. Please set the DIGITALAI_ACCESS_KEY and DIGITALAI_CLOUD_SERVER environment variables.",
      );
    }
    const buildPath = this.project.use.buildPath!;
    const cloudServer = process.env.DIGITALAI_CLOUD_SERVER;
    // If buildPath starts with "cloud:", the app is already registered in the
    // cloud — skip the upload and use it directly by bundle id.
    if (buildPath.startsWith("cloud:")) {
      logger.log(`Using pre-registered cloud app: ${buildPath}`);
      process.env[envVarKeyForBuild(this.project.name)] = this.appBundleId;
      return;
    }
    const isHttpUrl = buildPath.startsWith("http");
    const fetch = (await import("node-fetch")).default;
    logger.log(`Uploading: ${buildPath}`);
    let response;
    if (isHttpUrl) {
      response = await fetch(
        `${cloudServer}/api/v1/applications/new-from-url?url=${encodeURIComponent(buildPath)}`,
        {
          method: "POST",
          headers: {
            Authorization: getAuthHeader(),
          },
        },
      );
    } else {
      if (!fs.existsSync(buildPath)) {
        throw new Error(`Build file not found: ${buildPath}`);
      }
      const form = new FormData();
      form.append("file", fs.createReadStream(buildPath));
      response = await fetch(`${cloudServer}/api/v1/applications/new`, {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          ...form.getHeaders(),
        },
        body: form,
      });
    }
    const data = await response.json();
    if ((data as any).status !== "SUCCESS") {
      logger.error("Uploading the build failed:", data);
    }
    // App is referenced by bundle id in capabilities, not the returned numeric id.
    // Store a marker so createConfig can confirm globalSetup ran.
    process.env[envVarKeyForBuild(this.project.name)] = this.appBundleId;
  }

  async getDevice(): Promise<Device> {
    this.validateConfig();
    const config = this.createConfig();
    return await this.createDriver(config);
  }

  private validateConfig() {
    const device = this.project.use.device as DigitalAiConfig;
    if (!device.deviceQuery && (!device.name || !device.osVersion)) {
      throw new Error(
        "Either `deviceQuery` or both `name` and `osVersion` are required for running tests on Digital.ai Testing. Please set them in the `appwright.config.ts` file.",
      );
    }
  }

  private async createDriver(config: any): Promise<Device> {
    const WebDriver = (await import("webdriver")).default;
    this.webdriverClient = await WebDriver.newSession(config);
    this.sessionId = this.webdriverClient.sessionId;
    const testOptions = {
      expectTimeout: this.project.use.expectTimeout!,
    };
    return new Device(
      this.webdriverClient,
      this.appBundleId,
      testOptions,
      this.project.use.device?.provider!,
    );
  }

  async syncTestDetails(details: {
    status?: string;
    reason?: string;
    name?: string;
  }) {
    if (!this.webdriverClient || !details.status) {
      return;
    }
    // Status must be capitalized: Passed | Failed | Skipped
    const status =
      details.status.charAt(0).toUpperCase() + details.status.slice(1);
    try {
      await this.webdriverClient.executeScript(
        "seetest:client.setReportStatus",
        [status, details.reason ?? ""],
      );
    } catch (e) {
      // Best-effort: status sync must never break teardown
      logger.warn(`Could not sync test status to Digital.ai`);
    }
  }

  private createConfig() {
    const platformName = this.project.use.platform!;
    const device = this.project.use.device as DigitalAiConfig;
    const envVarKey = envVarKeyForBuild(this.project.name);
    if (!process.env[envVarKey]) {
      throw new Error(
        `process.env.${envVarKey} is not set. Did the file upload work?`,
      );
    }
    const os = platformName.toLowerCase();
    const parts = [`@os='${os}'`];
    if (device.name) parts.push(`@name='${device.name}'`);
    if (device.osVersion) parts.push(`@version='${device.osVersion}'`);
    const deviceQuery = device.deviceQuery ?? parts.join(" and ");
    return {
      port: 443,
      protocol: "https",
      path: "/wd/hub",
      logLevel: "warn",
      hostname: new URL(process.env.DIGITALAI_CLOUD_SERVER!).hostname,
      capabilities: {
        platformName: platformName,
        "appium:options": {
          app: `cloud:${this.appBundleId}`,
          ...(os === "android"
            ? { appPackage: this.appBundleId }
            : { bundleId: this.appBundleId }),
          ...device.appiumOptions,
        },
        "digitalai:options": {
          accessKey: process.env.DIGITALAI_ACCESS_KEY,
          deviceQuery,
          testName: `${this.projectName} ${platformName} test`,
          ...device.digitalAiOptions,
        },
      },
    };
  }
}
