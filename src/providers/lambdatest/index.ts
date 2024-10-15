import retry from "async-retry";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import { AppwrightConfig, DeviceProvider, LambdatestConfig } from "../../types";
import { FullProject } from "@playwright/test";
import { Device } from "../../device";
import { logger } from "../../logger";
import { getAuthHeader } from "./utils";

type LambdatestSessionDetails = {
  name: string;
  duration: number;
  platform: string;
  os_version: string;
  device: string;
  status_ind: string;
  build_name: string;
  remark: string;
  create_timestamp: string;
  start_timestamp: string;
  end_timestamp: string;
  console_logs_url: string;
  network_logs_url: string;
  command_logs_url: string;
  appium_logs_url: string;
  screenshot_url: string;
  video_url: string;
};

const API_BASE_URL =
  "https://mobile-api.lambdatest.com/mobile-automation/api/v1";

const envVarKeyForBuild = (projectName: string) =>
  `LAMBDATEST_APP_URL_${projectName.toUpperCase()}`;

export class LambdaTestDeviceProvider implements DeviceProvider {
  private sessionDetails?: LambdatestSessionDetails;
  private sessionId?: string;
  private project: FullProject<AppwrightConfig>;
  private projectName = path.basename(process.cwd());

  constructor(project: FullProject<AppwrightConfig>) {
    this.project = project;
  }

  async globalSetup() {
    if (!this.project.use.buildPath) {
      throw new Error(
        `Build path not found. Please set the build path in the config file.`,
      );
    }
    if (
      !(process.env.LAMBDATEST_USERNAME && process.env.LAMBDATEST_ACCESS_KEY)
    ) {
      throw new Error(
        "LAMBDATEST_USERNAME and LAMBDATEST_ACCESS_KEY are required environment variables for this device provider. Please set the LAMBDATEST_USERNAME and LAMBDATEST_ACCESS_KEY environment variables.",
      );
    }
    const buildPath = this.project.use.buildPath!;
    console.log(`Uploading: ${buildPath}`);
    const isUrl = buildPath.startsWith("http");
    let body;
    let headers = {
      Authorization: getAuthHeader(),
    };
    if (isUrl) {
      body = new URLSearchParams({
        url: buildPath,
        visibility: "team",
        storage: "url",
        name: this.projectName,
      });
    } else {
      if (!fs.existsSync(buildPath)) {
        throw new Error(`Build file not found: ${buildPath}`);
      }
      const form = new FormData();
      form.append("visibility", "team");
      form.append("storage", "file");
      form.append("appFile", fs.createReadStream(buildPath));
      form.append("name", this.projectName);
      headers = { ...headers, ...form.getHeaders() };
      body = form;
    }
    const fetch = (await import("node-fetch")).default;
    const response = await fetch(
      `https://manual-api.lambdatest.com/app/upload/realDevice`,
      {
        method: "POST",
        headers,
        body,
      },
    );
    const data = await response.json();
    const appUrl = (data as any).app_url;
    if (!appUrl) {
      logger.error("Uploading the build failed:", data);
    }
    process.env[envVarKeyForBuild(this.project.name)] = appUrl;
  }

  async getDevice(): Promise<Device> {
    this.validateConfig();
    const config = this.createConfig();
    return await this.createDriver(config);
  }

  private validateConfig() {
    const device = this.project.use.device as LambdatestConfig;
    if (!device.name || !device.osVersion) {
      throw new Error(
        "Device name and osVersion are required for running tests on LambdaTest. Please set the device name and osVersion in the `appwright.config.ts` file.",
      );
    }
  }

  private async createDriver(config: any): Promise<Device> {
    const WebDriver = (await import("webdriver")).default;
    const webDriverClient = await WebDriver.newSession(config);
    this.sessionId = webDriverClient.sessionId;
    //TODO: Find a way to get bundleID from the session
    const bundleId = "test";
    // await this.getAppBundleIdFromSession();
    const testOptions = {
      expectTimeout: this.project.use.expectTimeout!,
    };
    return new Device(
      webDriverClient,
      bundleId,
      testOptions,
      this.project.use.device?.provider!,
    );
  }

  private async getSessionDetails() {
    const response = await fetch(`${API_BASE_URL}/sessions/${this.sessionId}`, {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(),
      },
    });
    if (!response.ok) {
      throw new Error(`Error fetching session details: ${response.statusText}`);
    }
    const data = await response.json();
    this.sessionDetails = data.data;
  }

  //   private async getAppBundleIdFromSession(): Promise<string> {
  //     await this.getSessionDetails();
  //     return this.sessionDetails?.app_details.app_name ?? "";
  //   }

  async downloadVideo(
    outputDir: string,
    fileName: string,
  ): Promise<{ path: string; contentType: string } | null> {
    await this.getSessionDetails();
    const videoURL = this.sessionDetails?.video_url;
    const pathToTestVideo = path.join(
      outputDir,
      "videos-store",
      `${fileName}.mp4`,
    );
    const dir = path.dirname(pathToTestVideo);
    fs.mkdirSync(dir, { recursive: true });
    const fileStream = fs.createWriteStream(pathToTestVideo);
    if (videoURL) {
      await retry(
        async () => {
          const response = await fetch(videoURL, {
            method: "GET",
          });
          if (response.status !== 200) {
            // Retry if not 200
            throw new Error(
              `Video not found: ${response.status} (URL: ${this.sessionDetails?.video_url})`,
            );
          }
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("Failed to get reader from response body.");
          }
          const streamToFile = async () => {
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              fileStream.write(value);
            }
          };
          await streamToFile();
          fileStream.close();
        },
        {
          retries: 10,
          minTimeout: 3_000,
          onRetry: (err, i) => {
            if (i > 2) {
              logger.warn(`Retry attempt ${i} failed: ${err.message}`);
            }
          },
        },
      );

      return new Promise((resolve, reject) => {
        // Ensure file stream is closed even in case of an error
        fileStream.on("finish", () => {
          console.log(`Download finished and file closed: ${pathToTestVideo}`);
          resolve({ path: pathToTestVideo, contentType: "video/mp4" });
        });

        fileStream.on("error", (err) => {
          logger.error(`Failed to write file: ${err.message}`);
          reject(err);
        });
      });
    } else {
      return null;
    }
  }

  async syncTestDetails(details: {
    status?: string;
    reason?: string;
    name?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/sessions/${this.sessionId}`, {
      method: "PATCH",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: details.status
        ? JSON.stringify({
            name: details.name,
            status_ind: details.status,
            custom_data: details.reason,
          })
        : JSON.stringify({
            name: details.name,
          }),
    });
    if (!response.ok) {
      //TODO: Check whether add retry here or leave it as is because while setting the name of test
      //sometimes the session is not getting created till then thus this fails.
      //   throw new Error(`Error setting session details: ${response.statusText}`);
    }
    const responseData = await response.json();
    return responseData;
  }

  private createConfig() {
    const platformName = this.project.use.platform;
    const envVarKey = envVarKeyForBuild(this.project.name);
    if (!process.env[envVarKey]) {
      throw new Error(
        `process.env.${envVarKey} is not set. Did the file upload work?`,
      );
    }
    return {
      port: 443,
      protocol: "https",
      path: "/wd/hub",
      logLevel: "warn",
      user: process.env.LAMBDATEST_USERNAME,
      key: process.env.LAMBDATEST_ACCESS_KEY,
      hostname: "mobile-hub.lambdatest.com",
      capabilities: {
        appiumVersion: "2.3.0",
        platformName: platformName,
        queueTimeout: 600,
        idleTimeout: 600,
        deviceName: this.project.use.device?.name,
        deviceOrientation: this.project.use.device?.orientation,
        platformVersion: (this.project.use.device as LambdatestConfig)
          .osVersion,
        app: process.env[envVarKey],
        devicelog: true,
        video: true,
        build: `${this.projectName} ${platformName} ${
          process.env.GITHUB_ACTIONS === "true"
            ? `CI ${process.env.GITHUB_RUN_ID}`
            : process.env.USER
        }`,
        project: this.projectName,
        autoGrantPermissions: true,
        autoAcceptAlerts: true,
        isRealMobile: true,
      },
    };
  }
}
