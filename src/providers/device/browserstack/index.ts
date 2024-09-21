import fs from "fs";
import path, { join } from "path";
import retry from "async-retry";
import { TestInfo } from "@playwright/test";
import { AppwrightDriver } from "../../driver/webdriver";
import { AppwrightConfig, Device, TestInfoOptions } from "../../../types";
import { Client } from "webdriver";
export type BrowserstackSessionDetails = {
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

class BrowserstackDevice implements Device {
  private sessionDetails?: BrowserstackSessionDetails;
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

  async init() {
    this.createConfig();
  }

  async createDriver(): Promise<AppwrightDriver> {
    const WebDriver = (await import("webdriver")).default;
    const webdriverClient = await WebDriver.newSession(this.config as any);
    this.sessionId = webdriverClient.sessionId;
    await this.setSessionName(webdriverClient.sessionId, this.testInfo.title);
    const bundleId = await this.getAppBundleId();
    //@ts-ignore
    const expectTimeout = this.testInfo.project.use.expectTimeout;
    const testOptions: TestInfoOptions = {
      expectTimeout,
    };
    return new AppwrightDriver(webdriverClient, bundleId, testOptions);
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

  async setSessionStatus(status?: string, reason?: string) {
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
          "Content-Type": "application/json", // Set the content type to JSON
        },
        body: JSON.stringify({
          status: status,
          reason: reason,
        }), // Set the request body
      },
    );

    if (!response.ok) {
      throw new Error(`Error setting session details: ${response.statusText}`);
    }

    // Parse and print the response
    const responseData = await response.json();
    return responseData;
  }

  async readStreamToBuffer(stream: fs.ReadStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => {
        if (chunk instanceof Buffer) {
          chunks.push(chunk);
        }
      });
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  // Function to convert ReadStream to Blob
  async convertReadStreamToBlob(filePath: string): Promise<Blob> {
    const readStream = fs.createReadStream(filePath);

    // Convert ReadStream to Buffer
    const buffer = await this.readStreamToBuffer(readStream);

    // Convert Buffer to Blob
    const blob = new Blob([buffer]);

    return blob;
  }

  async cameraImageInjection(driver: Client): Promise<void> {
    const filePath = join(process.cwd(), "screenshot.png");
    const formData = new FormData();
    const blob = await this.convertReadStreamToBlob(filePath);
    formData.append("file", blob);
    formData.append("custom_id", "SampleMedia");
    const response = await fetch(
      "https://api-cloud.browserstack.com/app-automate/upload-media",
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${this.userName}:${this.accessKey}`).toString(
              "base64",
            ),
        },
        body: formData,
      },
    );

    const data: any = await response.json();
    await driver.execute(
      `browserstack_executor: {"action":"cameraImageInjection", "arguments": {"imageUrl" : "${data.media_url.trim()}"}}`,
    );
  }

  private async setSessionName(sessionId: string, data: any) {
    const response = await fetch(`${this.sessionBaseURL}/${sessionId}.json`, {
      method: "PUT",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${this.userName}:${this.accessKey}`).toString("base64"),
        "Content-Type": "application/json", // Set the content type to JSON
      },
      body: JSON.stringify({ name: `${data}` }), // Set the request body
    });

    if (!response.ok) {
      throw new Error(`Error setting session details: ${response.statusText}`);
    }

    // Parse and print the response
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
}

export class DeviceProvider {
  static async getDevice(testInfo: TestInfo): Promise<Device> {
    const device = new BrowserstackDevice(testInfo);
    await device.init();
    return device;
  }
}
