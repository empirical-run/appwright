import retry from "async-retry";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import { AppwrightConfig, DeviceProvider, LambdaTestConfig } from "../../types";
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

const browserStackToLambdaTest: {
  deviceName: Record<string, string>;
  osVersion: Record<string, string>;
} = {
  deviceName: {
    "Google Pixel 8": "Pixel 8",
  },
  osVersion: {
    "14.0": "14",
  },
};

const API_BASE_URL =
  "https://mobile-api.lambdatest.com/mobile-automation/api/v1";

const envVarKeyForBuild = (projectName: string) =>
  `LAMBDATEST_APP_URL_${projectName.toUpperCase()}`;

async function getSessionDetails(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
    },
  });
  if (!response.ok) {
    throw new Error(`Error fetching session details: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

export class LambdaTestDeviceProvider implements DeviceProvider {
  private sessionDetails?: LambdatestSessionDetails;
  sessionId?: string;
  private projectName = path.basename(process.cwd());

  constructor(
    private project: FullProject<AppwrightConfig>,
    private appBundleId: string | undefined,
  ) {
    if (!appBundleId) {
      throw new Error(
        "App Bundle ID is required for running tests on LambdaTest. Set the `appBundleId` for your projects that run on this provider.",
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
      !(process.env.LAMBDATEST_USERNAME && process.env.LAMBDATEST_ACCESS_KEY)
    ) {
      throw new Error(
        "LAMBDATEST_USERNAME and LAMBDATEST_ACCESS_KEY are required environment variables for this device provider. Please set the LAMBDATEST_USERNAME and LAMBDATEST_ACCESS_KEY environment variables.",
      );
    }
    const buildPath = this.project.use.buildPath!;
    const isHttpUrl = buildPath.startsWith("http");
    const isLambdaTestUrl = buildPath.startsWith("lt://");
    let appUrl: string | undefined = undefined;
    if (isLambdaTestUrl) {
      appUrl = buildPath;
    } else {
      let body;
      let headers = {
        Authorization: getAuthHeader(),
      };
      if (isHttpUrl) {
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
      logger.log(`Uploading: ${buildPath}`);
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
      appUrl = (data as any).app_url;
      if (!appUrl) {
        logger.error("Uploading the build failed:", data);
      }
    }
    process.env[envVarKeyForBuild(this.project.name)] = appUrl;
  }

  async getDevice(): Promise<Device> {
    this.validateConfig();
    const config = this.createConfig();
    return await this.createDriver(config);
  }

  private validateConfig() {
    const device = this.project.use.device as LambdaTestConfig;
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
    const testOptions = {
      expectTimeout: this.project.use.expectTimeout!,
    };
    return new Device(
      webDriverClient,
      this.appBundleId,
      testOptions,
      this.project.use.device?.provider!,
    );
  }

  static async downloadVideo(
    sessionId: string,
    outputDir: string,
    fileName: string,
  ): Promise<{ path: string; contentType: string } | null> {
    const sessionData = await getSessionDetails(sessionId);
    const sessionDetails = sessionData?.data;
    const videoURL = sessionDetails?.video_url;
    const pathToTestVideo = path.join(outputDir, `${fileName}.mp4`);
    const tempPathForWriting = `${pathToTestVideo}.part`;
    const dir = path.dirname(pathToTestVideo);
    fs.mkdirSync(dir, { recursive: true });
    const fileStream = fs.createWriteStream(tempPathForWriting);
    if (videoURL) {
      await retry(
        async () => {
          const response = await fetch(videoURL, {
            method: "GET",
          });
          if (response.status !== 200) {
            // Retry if not 200
            throw new Error(
              `Video not found: ${response.status} (URL: ${videoURL})`,
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
            if (i > 5) {
              logger.warn(`Retry attempt ${i} failed: ${err.message}`);
            }
          },
        },
      );
      return new Promise((resolve, reject) => {
        // Ensure file stream is closed even in case of an error
        fileStream.on("finish", () => {
          fs.renameSync(tempPathForWriting, pathToTestVideo);
          logger.log(`Download finished and file closed: ${pathToTestVideo}`);
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

  private deviceInfoForSession() {
    let deviceName = this.project.use.device?.name;
    let osVersion = (this.project.use.device as LambdaTestConfig).osVersion;
    if (
      deviceName &&
      Object.keys(browserStackToLambdaTest.deviceName).includes(deviceName)
    ) {
      // we map BrowserStack names to LambdaTest for better usability
      deviceName = browserStackToLambdaTest.deviceName[deviceName];
    }
    if (
      osVersion &&
      Object.keys(browserStackToLambdaTest.osVersion).includes(osVersion)
    ) {
      osVersion = browserStackToLambdaTest.osVersion[osVersion]!;
    }
    return {
      deviceName,
      platformVersion: osVersion,
      deviceOrientation: this.project.use.device?.orientation,
    };
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
        ...this.deviceInfoForSession(),
        appiumVersion: "2.3.0",
        platformName: platformName,
        queueTimeout: 600,
        idleTimeout: 600,
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
        enableImageInjection: (this.project.use.device as LambdaTestConfig)
          ?.enableCameraImageInjection,
        "settings[snapshotMaxDepth]": 62,
      },
    };
  }
}
