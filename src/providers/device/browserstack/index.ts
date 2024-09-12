import fs from "fs";
import path from "path";
import retry from "async-retry";
import { BrowserstackSessionDetails, Device } from "../types";
import { TestInfo } from "@playwright/test";
import { AppwrightDriver } from "../../driver/webdriver";
import { config } from "../../../../bs-config/webdriver_config";

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
    // TODO: Get config details from appwright config using [testInfo]
    this.config = this.updateBuildIdentifierInConfig(config);
  }

  async createDriver(): Promise<AppwrightDriver> {
    const WebDriver = (await import("webdriver")).default;
    const webdriverClient = await WebDriver.newSession(this.config as any);
    this.sessionId = webdriverClient.sessionId;
    await this.setSessionName(webdriverClient.sessionId, this.testInfo.title);
    return new AppwrightDriver(webdriverClient);
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
     * an incomplete file, we introduce a delay before attempting the download.
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
          minTimeout: 5_000,
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

  ///TODO: Remove any type
  private updateBuildIdentifierInConfig(config: any): any {
    const env = process.env;
    const newBuildNumber =
      env.GITHUB_ACTIONS === "true" ? `CI ${env.GITHUB_RUN_ID}` : env.USER;

    if (newBuildNumber) {
      if (config.capabilities && config.capabilities["bstack:options"]) {
        config.capabilities["bstack:options"].buildIdentifier = newBuildNumber;
      }
    }
    return config;
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
}

export class DeviceProvider {
  static async getDevice(testInfo: TestInfo): Promise<Device> {
    const device = new BrowserstackDevice(testInfo);
    await device.init();
    return device;
  }
}
