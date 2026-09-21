import { DeviceOrientation, Platform, RobotActionsConfig } from "../../types";

export const GRID_URL_ENV = "ROBOTACTIONS_GRID_URL";
export const TOKEN_ENV = "ROBOTACTIONS_TOKEN";
export const API_URL_ENV = "ROBOTACTIONS_API_URL";

export type GridEnv = {
  /** Base URL of the grid's WebDriver proxy, no trailing slash. */
  gridUrl: string;
  /** JWT issued by the RobotActions dashboard. */
  token: string;
  /**
   * Base URL used for video download. The grid proxy serves the video routes
   * itself, so this is the grid URL unless `ROBOTACTIONS_API_URL` points
   * somewhere else (e.g. a LAN-only history API on port 3001).
   */
  apiUrl: string;
};

function normalizeUrl(raw: string, envName: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${envName} is not a valid URL: "${raw}"`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${envName} must be an http(s) URL, got "${raw}"`);
  }
  return url.toString().replace(/\/+$/, "");
}

export function readGridEnv(env = process.env): GridEnv {
  const gridUrl = env[GRID_URL_ENV];
  const token = env[TOKEN_ENV];
  if (!gridUrl || !token) {
    throw new Error(
      `${GRID_URL_ENV} and ${TOKEN_ENV} are required environment variables for the RobotActions device provider. ` +
        `Set ${GRID_URL_ENV} to your grid URL (e.g. https://grid.robotactions.com) and ${TOKEN_ENV} to a token from the dashboard.`,
    );
  }
  const normalizedGridUrl = normalizeUrl(gridUrl, GRID_URL_ENV);
  const apiUrl = env[API_URL_ENV];
  return {
    gridUrl: normalizedGridUrl,
    token,
    apiUrl: apiUrl ? normalizeUrl(apiUrl, API_URL_ENV) : normalizedGridUrl,
  };
}

export type WebDriverTarget = {
  protocol: "http" | "https";
  hostname: string;
  port: number;
  path: string;
};

/**
 * Splits a grid URL into the fields the `webdriver` client expects. The client
 * builds every request as `${protocol}://${hostname}:${port}${path}${endpoint}`,
 * so the URL's path (if any) becomes a prefix for `/session`.
 */
export function toWebDriverTarget(gridUrl: string): WebDriverTarget {
  const url = new URL(gridUrl);
  const protocol = url.protocol === "https:" ? "https" : "http";
  const port = url.port ? Number(url.port) : protocol === "https" ? 443 : 80;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  return { protocol, hostname: url.hostname, port, path };
}

/**
 * The grid's Appium nodes download the build themselves, so `buildPath` must be
 * a URL they can reach — a local file on the test runner is not visible to them.
 */
export function validateBuildUrl(buildPath: string | undefined): string {
  if (!buildPath) {
    throw new Error(
      `Build path not found. Please set the build path in appwright.config.ts`,
    );
  }
  if (!/^https?:\/\//i.test(buildPath)) {
    throw new Error(
      `The RobotActions provider needs buildPath to be an http(s) URL the grid can download the build from (got "${buildPath}"). ` +
        `Upload the build to your artifact store (CI artifact, S3 presigned URL, …) and use that URL.`,
    );
  }
  return buildPath;
}

export function defaultTestSuite(projectName: string): string {
  return `AppWright ${projectName}`;
}

export type CapabilityInput = {
  platform: Platform;
  device: RobotActionsConfig;
  buildUrl: string;
  projectName: string;
};

export function buildCapabilities({
  platform,
  device,
  buildUrl,
  projectName,
}: CapabilityInput): Record<string, unknown> {
  const caps: Record<string, unknown> = {
    platformName: platform,
    "appium:automationName":
      platform == Platform.ANDROID ? "uiautomator2" : "xcuitest",
    "appium:app": buildUrl,
    "appium:autoGrantPermissions": true,
    "appium:autoAcceptAlerts": true,
    "appium:fullReset": true,
    "appium:settings[snapshotMaxDepth]": 62,
    "ra:testsuite": device.testSuite ?? defaultTestSuite(projectName),
  };
  if (platform == Platform.ANDROID) {
    // Accept whatever activity the app lands on — onboarding/splash flows
    // redirect before the manifest's launcher activity is ever resumed, and
    // UiAutomator2 would otherwise fail with "MainActivity never started".
    caps["appium:appWaitActivity"] = "*";
  }
  if (device.udid) caps["appium:udid"] = device.udid;
  if (device.name) caps["appium:deviceName"] = device.name;
  if (device.osVersion) caps["appium:platformVersion"] = device.osVersion;
  if (device.orientation) {
    caps["appium:orientation"] =
      device.orientation == DeviceOrientation.LANDSCAPE
        ? "LANDSCAPE"
        : "PORTRAIT";
  }
  return { ...caps, ...device.capabilities };
}

/**
 * Playwright reports `passed | failed | timedOut | skipped | interrupted`;
 * the grid only records `passed | failed`. Skipped tests are left unmarked.
 */
export function toGridStatus(
  status: string | undefined,
): "passed" | "failed" | undefined {
  switch (status) {
    case "passed":
      return "passed";
    case "failed":
    case "timedOut":
    case "interrupted":
      return "failed";
    default:
      return undefined;
  }
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
