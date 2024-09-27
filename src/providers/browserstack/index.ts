import retry from "async-retry";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import {
  AppwrightConfig,
  DeviceProvider,
  BrowserstackConfig,
} from "../../types";
import { FullProject } from "@playwright/test";
import { Device } from "../../device";

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

export class BrowserStackDeviceProvider implements DeviceProvider {
  private sessionDetails?: BrowserStackSessionDetails;
  private sessionId?: string;
  private project: FullProject<AppwrightConfig>;

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
      !(
        process.env.BROWSERSTACK_USERNAME && process.env.BROWSERSTACK_ACCESS_KEY
      )
    ) {
      throw new Error(
        "BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY are required environment variables for this device provider.",
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
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers,
      body,
    });
    const data = await response.json();
    const appUrl = (data as any).app_url;
    if (!appUrl) {
      console.error("Uploading the build failed:", data);
    }
    process.env[envVarKeyForBuild(this.project.name)] = appUrl;
  }

  async getDevice(): Promise<Device> {
    this.validateConfig();
    const config = this.createConfig();
    return await this.createDriver(config);
  }

  private validateConfig() {
    const device = this.project.use.device as BrowserstackConfig;
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
    const response = await fetch(
      `${API_BASE_URL}/sessions/${this.sessionId}.json`,
      {
        method: "GET",
        headers: {
          Authorization: getAuthHeader(),
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Error fetching session details: ${response.statusText}`);
    }
    const data = await response.json();
    this.sessionDetails = data.automation_session;
  }

  private async getAppBundleIdFromSession(): Promise<string> {
    await this.getSessionDetails();
    return this.sessionDetails?.app_details.app_name ?? "";
  }

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
          factor: 2,
          minTimeout: 3_000,
        },
      );
      return new Promise((resolve, reject) => {
        // Ensure file stream is closed even in case of an error
        fileStream.on("finish", () => {
          console.log(`Download finished and file closed: ${pathToTestVideo}`);
          resolve({ path: pathToTestVideo, contentType: "video/mp4" });
        });

        fileStream.on("error", (err) => {
          console.error(`Failed to write file: ${err.message}`);
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
    const response = await fetch(
      `${API_BASE_URL}/sessions/${this.sessionId}.json`,
      {
        method: "PUT",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: details.name
          ? JSON.stringify({
              name: details.name,
            })
          : JSON.stringify({
              status: details.status,
              reason: details.reason,
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
    if (!process.env[envVarKey]) {
      throw new Error(
        `process.env.${envVarKey} is not set. Did the file upload work?`,
      );
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
        "bstack:options": {
          debug: true,
          interactiveDebugging: true,
          networkLogs: true,
          appiumVersion: "2.6.0",
          enableCameraImageInjection: true,
          deviceName: this.project.use.device?.name,
          osVersion: (this.project.use.device as BrowserstackConfig).osVersion,
          platformName: platformName,
          buildName: `${projectName} ${platformName}`,
          sessionName: `${projectName} ${platformName} test`,
          buildIdentifier:
            process.env.GITHUB_ACTIONS === "true"
              ? `CI ${process.env.GITHUB_RUN_ID}`
              : process.env.USER,
        },
        "appium:autoGrantPermissions": true,
        "appium:app": process.env[envVarKey],
        "appium:autoAcceptAlerts": true,
        "appium:fullReset": true,
      },
    };
  }
}
