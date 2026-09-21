import retry from "async-retry";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import {
  AppwrightConfig,
  DeviceProvider,
  RobotActionsConfig,
} from "../../types";
import { FullProject } from "@playwright/test";
import { Device } from "../../device";
import { logger } from "../../logger";
import {
  authHeaders,
  buildCapabilities,
  readGridEnv,
  toGridStatus,
  toWebDriverTarget,
  validateBuildUrl,
} from "./utils";

type GridVideo = {
  filename: string;
  status: "recording" | "stopped" | "completed" | "error" | string;
  url: string;
  durationSeconds: number | null;
};

// Video is finalized before DELETE /session returns, so the first poll normally
// succeeds; the retries cover a slow ffmpeg finalize on long recordings.
const VIDEO_POLL = { retries: 10, minTimeout: 3_000, maxTimeout: 3_000 };

/**
 * Runs tests on real devices attached to a RobotActions grid. The grid speaks
 * plain W3C WebDriver behind an auth proxy, so this provider is a thin session
 * factory plus the two dashboard integrations AppWright expects: test status
 * sync and video download.
 */
export class RobotActionsDeviceProvider implements DeviceProvider {
  sessionId?: string;

  constructor(
    private project: FullProject<AppwrightConfig>,
    private appBundleId: string | undefined,
  ) {
    if (!appBundleId) {
      throw new Error(
        "App Bundle ID is required for running tests on RobotActions. Set the `appBundleId` for your projects that run on this provider.",
      );
    }
  }

  async globalSetup() {
    // Fail fast in the main process rather than once per worker.
    readGridEnv();
    validateBuildUrl(this.project.use.buildPath);
  }

  async getDevice(): Promise<Device> {
    const { gridUrl, token } = readGridEnv();
    const buildUrl = validateBuildUrl(this.project.use.buildPath);
    const platform = this.project.use.platform;
    if (!platform) {
      throw new Error("Platform is not specified in the configuration.");
    }
    const target = toWebDriverTarget(gridUrl);
    const config = {
      ...target,
      logLevel: "warn" as const,
      // Bearer on every request: the proxy gates DELETE /session as well as
      // POST /session, and `user`/`key` would only cover the latter.
      headers: authHeaders(token),
      // Never let a node's directConnect caps route us around the proxy.
      enableDirectConnect: false,
      // Device sessions can take minutes to start (app download, WDA launch).
      connectionRetryTimeout: 300_000,
      capabilities: buildCapabilities({
        platform,
        device: this.project.use.device as RobotActionsConfig,
        buildUrl,
        projectName: this.project.name,
      }),
    };
    const WebDriver = (await import("webdriver")).default;
    const webDriverClient = await WebDriver.newSession(config);
    this.sessionId = webDriverClient.sessionId;
    return new Device(
      webDriverClient,
      this.appBundleId,
      { expectTimeout: this.project.use.expectTimeout! },
      this.project.use.device?.provider!,
    );
  }

  async syncTestDetails(details: {
    status?: string;
    reason?: string;
    name?: string;
  }) {
    if (!this.sessionId) return;
    const { gridUrl, token } = readGridEnv();
    const status = toGridStatus(details.status);
    const body: Record<string, string> = {};
    if (details.name) body.testName = details.name;
    if (status) body.status = status;
    if (status === "failed" && details.reason) body.reason = details.reason;
    if (Object.keys(body).length === 0) return;
    try {
      const response = await fetch(
        `${gridUrl}/api/sessions/${this.sessionId}/result`,
        {
          method: "POST",
          headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        logger.warn(
          `RobotActions: could not sync test details for session ${this.sessionId}: ${response.status} ${response.statusText}`,
        );
      }
    } catch (e) {
      // Reporting is best-effort; never fail the test over it.
      logger.warn(
        `RobotActions: could not sync test details for session ${this.sessionId}:`,
        e,
      );
    }
  }

  static async downloadVideo(
    sessionId: string,
    outputDir: string,
    fileName: string,
  ): Promise<{ path: string; contentType: string } | null> {
    // Called from the reporter process: only env is available, not the instance.
    let env;
    try {
      env = readGridEnv();
    } catch (e) {
      logger.warn(`RobotActions: skipping video download:`, e);
      return null;
    }
    const { apiUrl, token } = env;
    const pathToTestVideo = path.join(outputDir, `${fileName}.mp4`);
    const tempPathForWriting = `${pathToTestVideo}.part`;
    fs.mkdirSync(path.dirname(pathToTestVideo), { recursive: true });
    try {
      const video = await retry(
        async () => {
          const response = await fetch(
            `${apiUrl}/api/sessions/${sessionId}/videos`,
            { headers: authHeaders(token) },
          );
          if (!response.ok) {
            throw new Error(
              `videos lookup failed: ${response.status} ${response.statusText}`,
            );
          }
          const { videos } = (await response.json()) as { videos: GridVideo[] };
          const ready = videos.find(
            (v) => v.status === "stopped" || v.status === "completed",
          );
          if (!ready) {
            throw new Error(`video not finalized yet (${videos.length} rows)`);
          }
          return ready;
        },
        {
          ...VIDEO_POLL,
          onRetry: (err, i) => {
            if (i > 5) {
              logger.warn(`Retry attempt ${i} failed: ${err.message}`);
            }
          },
        },
      );
      const response = await fetch(`${apiUrl}${video.url}`, {
        headers: authHeaders(token),
      });
      if (!response.ok || !response.body) {
        throw new Error(
          `video download failed: ${response.status} ${response.statusText} (URL: ${video.url})`,
        );
      }
      await pipeline(
        Readable.fromWeb(response.body as import("stream/web").ReadableStream),
        fs.createWriteStream(tempPathForWriting),
      );
      fs.renameSync(tempPathForWriting, pathToTestVideo);
      logger.log(`Download finished and file closed: ${pathToTestVideo}`);
      return { path: pathToTestVideo, contentType: "video/mp4" };
    } catch (e) {
      logger.log(`Error Downloading video: `, e);
      fs.rmSync(tempPathForWriting, { force: true });
      return null;
    }
  }
}
