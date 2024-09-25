import fs from "fs";
import path from "path";
import retry from "async-retry";
import { TestInfo } from "@playwright/test";
import { AppwrightConfig, DeviceProvider, TestInfoOptions } from "../../types";
// @ts-ignore ts not able to identify the import is just an interface
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

export class BrowserStackDeviceProvider implements DeviceProvider {
  private sessionDetails?: BrowserStackSessionDetails;
  private testInfo: TestInfo;
  private userName = process.env.BROWSERSTACK_USERNAME;
  private accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  private sessionId?: string;
  private sessionBaseURL =
    "https://api-cloud.browserstack.com/app-automate/sessions";
  private config: any;

  constructor(testInfo: TestInfo) {
    this.testInfo = testInfo;
  }

  async getDevice(): Promise<Device> {
    this.createConfig();
    return await this.createDriver();
  }

  private async createDriver(): Promise<Device> {
    const WebDriver = (await import("webdriver")).default;
    const webDriverClient = await WebDriver.newSession(this.config as any);
    this.sessionId = webDriverClient.sessionId;
    await this.syncTestDetails({ name: this.testInfo.title });
    const bundleId = await this.getAppBundleId();
    //@ts-ignore
    const expectTimeout = this.testInfo.project.use.expectTimeout;
    const testOptions: TestInfoOptions = {
      expectTimeout,
    };
    return new Device(webDriverClient, bundleId, testOptions);
  }

  private async getSessionDetails() {
    const response = await fetch(
      `${this.sessionBaseURL}/${this.sessionId}.json`,
      {
        method: "GET",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${this.userName}:${this.accessKey}`).toString(
              "base64",
            ),
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error fetching session details: ${response.statusText}`);
    }

    const data = await response.json();
    this.sessionDetails = data.automation_session;
  }

  private async getAppBundleId(): Promise<string> {
    await this.getSessionDetails();
    return this.sessionDetails?.app_details.app_name ?? "";
  }

  async downloadVideo(): Promise<{ path: string; contentType: string } | null> {
    await this.getSessionDetails();
    const videoURL = this.sessionDetails?.video_url;
    const pathToTestVideo = path.join(
      this.testInfo.project.outputDir,
      "videos-store",
      `${this.testInfo.testId}.mp4`,
    );
    const dir = path.dirname(pathToTestVideo);
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Video URL: ${videoURL}`);
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

          console.log(`Response: ${response.status}`);
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
          onRetry: (err, i) => {
            console.log(`Retry attempt ${i} failed: ${err.message}`);
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
      `${this.sessionBaseURL}/${this.sessionId}.json`,
      {
        method: "PUT",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${this.userName}:${this.accessKey}`).toString(
              "base64",
            ),
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
    const platformName = (this.testInfo.project.use as AppwrightConfig)
      .platform;
    const projectName = path.basename(process.cwd());
    this.config = {
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
          deviceName: (this.testInfo.project.use as AppwrightConfig).deviceName,
          osVersion: (this.testInfo.project.use as AppwrightConfig).osVersion,
          platformName: platformName,
          buildName: `${projectName} ${platformName}`,
          sessionName: `${projectName} ${platformName} test`,
          buildIdentifier:
            process.env.GITHUB_ACTIONS === "true"
              ? `CI ${process.env.GITHUB_RUN_ID}`
              : process.env.USER,
        },
        "appium:autoGrantPermissions": true,
        "appium:app": (this.testInfo.project.use as AppwrightConfig).buildURL,
        "appium:autoAcceptAlerts": true,
        "appium:fullReset": true,
      },
    };
  }
}
