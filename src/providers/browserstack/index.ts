import retry from "async-retry";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import {
  AppwrightConfig,
  DeviceProvider,
  BrowserStackConfig,
} from "../../types";
import { FullProject } from "@playwright/test";
import { Device } from "../../device";
import { logger } from "../../logger";

type BrowserStackSessionDetails = {
  name: string;
  duration: number;
  os: string;
  os_version: string;
  device: string;
  status: string;
  reason: string;
  build_name: string;
  project_name: string;
  logs: string;
  public_url: string;
  appium_logs_url: string;
  video_url: string;
  device_logs_url: string;
  app_details: {
    app_url: string;
    app_name: string;
    app_version: string;
    app_custom_id: string;
    uploaded_at: string;
  };
};

const API_BASE_URL = "https://api-cloud.browserstack.com/app-automate";

const envVarKeyForBuild = (projectName: string) =>
  `BROWSERSTACK_APP_URL_${projectName.toUpperCase()}`;

function getAuthHeader() {
  const userName = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  const key = Buffer.from(`${userName}:${accessKey}`).toString("base64");
  return `Basic ${key}`;
}

async function getSessionDetails(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}.json`, {
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

export class BrowserStackDeviceProvider implements DeviceProvider {
  private sessionDetails?: BrowserStackSessionDetails;
  sessionId?: string;
  private project: FullProject<AppwrightConfig>;

  constructor(
    project: FullProject<AppwrightConfig>,
    appBundleId: string | undefined,
  ) {
    this.project = project;
    if (appBundleId) {
      logger.log(
        `Bundle id is specified (${appBundleId}) but ignored for BrowserStack provider.`,
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
      !(
        process.env.BROWSERSTACK_USERNAME && process.env.BROWSERSTACK_ACCESS_KEY
      )
    ) {
      throw new Error(
        "BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY are required environment variables for this device provider.",
      );
    }
    const buildPath = this.project.use.buildPath!;
    const isHttpUrl = buildPath.startsWith("http");
    const isBrowserStackUrl = buildPath.startsWith("bs://");
    let appUrl: string | undefined = undefined;
    if (isBrowserStackUrl) {
      appUrl = buildPath;
    } else {
      // Upload the file to BrowserStack and get the appUrl
      let body;
      let headers = {
        Authorization: getAuthHeader(),
      };
      if (isHttpUrl) {
        body = new URLSearchParams({
          url: buildPath,
        });
      } else {
        if (!fs.existsSync(buildPath)) {
          throw new Error(`Build file not found: ${buildPath}`);
        }
        const form = new FormData();
        form.append("file", fs.createReadStream(buildPath));
        headers = { ...headers, ...form.getHeaders() };
        body = form;
      }
      const fetch = (await import("node-fetch")).default;
      logger.log(`Uploading: ${buildPath}`);
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers,
        body,
      });
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
    const device = this.project.use.device as BrowserStackConfig;
    if (!device.name || !device.osVersion) {
      throw new Error(
        "Device name and osVersion are required for running tests on BrowserStack",
      );
    }
  }

  private async createDriver(config: any): Promise<Device> {
    const WebDriver = (await import("webdriver")).default;
    const webDriverClient = await WebDriver.newSession(config);
    this.sessionId = webDriverClient.sessionId;
    const bundleId = await this.getAppBundleIdFromSession();
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
    const data = await getSessionDetails(this.sessionId!);
    this.sessionDetails = data.automation_session;
  }

  private async getAppBundleIdFromSession(): Promise<string> {
    await this.getSessionDetails();
    return this.sessionDetails?.app_details.app_name ?? "";
  }

  static async downloadVideo(
    sessionId: string,
    outputDir: string,
    fileName: string,
  ): Promise<{ path: string; contentType: string } | null> {
    const sessionData = await getSessionDetails(sessionId);
    const sessionDetails = sessionData?.automation_session;
    const videoURL = sessionDetails?.video_url;
    const pathToTestVideo = path.join(outputDir, `${fileName}.mp4`);
    const tempPathForWriting = `${pathToTestVideo}.part`;
    const dir = path.dirname(pathToTestVideo);
    fs.mkdirSync(dir, { recursive: true });
    /**
     * The BrowserStack video URL initially returns a 200 status,
     * but the video file may still be empty. To avoid downloading
     * an incomplete file, we introduce a delay of 10_000 ms before attempting the download.
     * After the wait, BrowserStack may return a 403 error if the video is not
     * yet available. We handle this by retrying the download until we either
     * receive a 200 response (indicating the video is ready) or reach a maximum
     * of 10 retries, whichever comes first.
     */
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    const fileStream = fs.createWriteStream(tempPathForWriting);
    //To catch the browserstack error in case all retries fails
    try {
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
            try {
              fs.renameSync(tempPathForWriting, pathToTestVideo);
              logger.log(
                `Download finished and file closed: ${pathToTestVideo}`,
              );
              resolve({ path: pathToTestVideo, contentType: "video/mp4" });
            } catch (err) {
              logger.error(`Failed to rename file: `, err);
              reject(err);
            }
          });

          fileStream.on("error", (err) => {
            logger.error(`Failed to write file: ${err.message}`);
            reject(err);
          });
        });
      } else {
        return null;
      }
    } catch (e) {
      logger.log(`Error Downloading video: `, e);
      return null;
    }
  }

  async syncTestDetails(details: {
    status?: string;
    reason?: string;
    name?: string;
  }) {
    const response = await fetch(
      `${API_BASE_URL}/sessions/${this.sessionId}.json`,
      {
        method: "PUT",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: details.status
          ? JSON.stringify({
              status: details.status,
              reason: details.reason,
            })
          : JSON.stringify({
              name: details.name,
            }),
      },
    );
    if (!response.ok) {
      throw new Error(`Error setting session details: ${response.statusText}`);
    }

    const responseData = await response.json();
    return responseData;
  }

  private createConfig() {
    const platformName = this.project.use.platform;
    const projectName = path.basename(process.cwd());
    const envVarKey = envVarKeyForBuild(this.project.name);
    const deviceConfig = this.project.use.device as BrowserStackConfig;
    const configuredAppiumVersion =
      deviceConfig.appiumVersion ??
      process.env.BROWSERSTACK_APPIUM_VERSION ??
      "3.1.0";
    if (!process.env[envVarKey]) {
      throw new Error(
        `process.env.${envVarKey} is not set. Did the file upload work?`,
      );
    }
    const bstackOptions: Record<string, unknown> = {
      debug: true,
      interactiveDebugging: true,
      networkLogs: true,
      appiumVersion: configuredAppiumVersion,
      enableCameraImageInjection: deviceConfig?.enableCameraImageInjection,
      idleTimeout: deviceConfig?.idleTimeout ?? 180,
      deviceName: deviceConfig?.name,
      osVersion: deviceConfig.osVersion,
      platformName: platformName,
      deviceOrientation: deviceConfig?.orientation,
      buildName: `${projectName} ${platformName}`,
      sessionName: `${projectName} ${platformName} test`,
      buildIdentifier:
        process.env.GITHUB_ACTIONS === "true"
          ? `CI ${process.env.GITHUB_RUN_ID}`
          : process.env.USER,
    };

    if (typeof deviceConfig?.appProfiling === "boolean") {
      bstackOptions.appProfiling = deviceConfig.appProfiling;
    }

    return {
      port: 443,
      path: "/wd/hub",
      protocol: "https",
      logLevel: "warn",
      user: process.env.BROWSERSTACK_USERNAME,
      key: process.env.BROWSERSTACK_ACCESS_KEY,
      hostname: "hub.browserstack.com",
      capabilities: {
        "bstack:options": bstackOptions,
        "appium:autoGrantPermissions": true,
        "appium:app": process.env[envVarKey],
        "appium:autoAcceptAlerts": true,
        "appium:fullReset": true,
        "appium:settings[snapshotMaxDepth]": 62,
      },
    };
  }
}
