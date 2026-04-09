import retry from "async-retry";
import fs from "fs";
import path from "path";
import { AppwrightConfig, DeviceProvider, KobitonConfig } from "../../types";
import { FullProject } from "@playwright/test";
import { Device } from "../../device";
import { logger } from "../../logger";
import { getAuthHeader } from "./utils";

const API_BASE_URL = "https://api.kobiton.com/v1";

const envVarKeyForBuild = (projectName: string) =>
  `KOBITON_APP_ID_${projectName.toUpperCase()}`;

async function getSessionDetails(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Error fetching session details: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

export class KobitonDeviceProvider implements DeviceProvider {
  sessionId?: string;
  private projectName = path.basename(process.cwd());

  constructor(
    private project: FullProject<AppwrightConfig>,
    private appBundleId: string | undefined,
  ) {
    if (!appBundleId) {
      throw new Error(
        "App Bundle ID is required for running tests on Kobiton. Set the `appBundleId` for your projects that run on this provider.",
      );
    }
  }

  async globalSetup() {
    if (!this.project.use.buildPath) {
      throw new Error(
        `Build path not found. Please set the build path in the config file.`,
      );
    }
    if (!(process.env.KOBITON_USERNAME && process.env.KOBITON_API_KEY)) {
      throw new Error(
        "KOBITON_USERNAME and KOBITON_API_KEY are required environment variables for this device provider. Please set them before running tests.",
      );
    }

    const buildPath = this.project.use.buildPath!;
    const isKobitonAppId = buildPath.startsWith("kobiton-store:");

    let appId: string | undefined = undefined;

    if (isKobitonAppId) {
      // User already provided a kobiton-store app ID directly
      appId = buildPath;
    } else {
      // Upload the app to Kobiton via the 3-step S3 upload flow
      if (!fs.existsSync(buildPath)) {
        throw new Error(`Build file not found: ${buildPath}`);
      }

      const filename = path.basename(buildPath);
      const fetch = (await import("node-fetch")).default;

      // Step 1: Get a presigned S3 upload URL
      logger.log(`Requesting upload URL for: ${filename}`);
      const uploadUrlResponse = await fetch(`${API_BASE_URL}/apps/uploadUrl`, {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ filename }),
      });

      if (!uploadUrlResponse.ok) {
        throw new Error(
          `Failed to get upload URL: ${uploadUrlResponse.statusText}`,
        );
      }

      const uploadUrlData = (await uploadUrlResponse.json()) as {
        url: string;
        appPath: string;
      };
      const { url: presignedUrl, appPath } = uploadUrlData;

      // Step 2: Upload the file directly to S3
      logger.log(`Uploading app to S3: ${buildPath}`);
      const fileBuffer = fs.readFileSync(buildPath);
      const s3Response = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-amz-tagging": "unsaved=true",
        },
        body: fileBuffer,
      });

      if (!s3Response.ok) {
        throw new Error(`S3 upload failed: ${s3Response.statusText}`);
      }

      // Step 3: Register the uploaded app in Kobiton
      logger.log(`Registering app in Kobiton repository...`);
      const registerResponse = await fetch(`${API_BASE_URL}/apps`, {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ filename, appPath }),
      });

      if (!registerResponse.ok) {
        const errorBody = await registerResponse.text();
        logger.error("Registering the build failed:", errorBody);
        throw new Error(
          `Failed to register app in Kobiton: ${registerResponse.statusText}`,
        );
      }

      const registerData = (await registerResponse.json()) as {
        appId: number;
        versionId: number;
      };
      appId = `kobiton-store:v${registerData.versionId}`;

      if (!appId) {
        throw new Error(
          "App upload succeeded but no versionId was returned from Kobiton.",
        );
      }

      logger.log(`App uploaded successfully. Kobiton versionId: ${appId}`);
      logger.log(`Waiting for Kobiton to process the app...`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    process.env[envVarKeyForBuild(this.project.name)] = appId;
  }

  async getDevice(): Promise<Device> {
    this.validateConfig();
    const config = this.createConfig();
    return await this.createDriver(config);
  }

  private validateConfig() {
    const device = this.project.use.device as KobitonConfig;
    if (!device.name) {
      throw new Error(
        "Device name is required for running tests on Kobiton. Please set the device name in the `appwright.config.ts` file.",
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
    const videoURL = sessionData?.video;
    const pathToTestVideo = path.join(outputDir, `${fileName}.mp4`);
    const tempPathForWriting = `${pathToTestVideo}.part`;
    const dir = path.dirname(pathToTestVideo);
    fs.mkdirSync(dir, { recursive: true });
    const fileStream = fs.createWriteStream(tempPathForWriting);
    try {
      if (videoURL) {
        await retry(
          async () => {
            const response = await fetch(videoURL, {
              method: "GET",
            });
            if (response.status !== 200) {
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
    try {
      const body: Record<string, string> = {};
      if (details.name) body["name"] = details.name;
      if (details.status) body["status"] = details.status;
      if (details.reason) body["description"] = details.reason;
      const response = await fetch(
        `${API_BASE_URL}/sessions/${this.sessionId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: getAuthHeader(),
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (response.ok) return await response.json();
    } catch (e) {
      logger.warn(`Could not sync test details to Kobiton`);
    }
    return {};
  }

  private createConfig() {
    const platformName = this.project.use.platform;
    const device = this.project.use.device as KobitonConfig;
    const envVarKey = envVarKeyForBuild(this.project.name);
    if (!process.env[envVarKey]) {
      throw new Error(
        `process.env.${envVarKey} is not set. Did the file upload work?`,
      );
    }
    return {
      protocol: "https",
      logLevel: "warn",
      hostname: "api.kobiton.com",
      path: "/wd/hub",
      port: 443,
      user: process.env.KOBITON_USERNAME,
      key: process.env.KOBITON_API_KEY,
      capabilities: {
        "kobiton:sessionName": `${this.projectName} ${platformName} test`,
        "kobiton:sessionDescription": `Appwright test run on Kobiton - ${this.projectName}`,
        "kobiton:deviceOrientation": device?.orientation ?? "portrait",
        "kobiton:captureScreenshots": true,
        "kobiton:deviceGroup": "KOBITON",
        "appium:deviceName": device.name,
        "appium:platformVersion": device.osVersion,
        platformName: platformName,
        "appium:app": process.env[envVarKey],
        "appium:autoGrantPermissions": true,
        "appium:autoAcceptAlerts": true,
        "appium:fullReset": true,
        "appium:settings[snapshotMaxDepth]": 62,
      },
    };
  }
}
