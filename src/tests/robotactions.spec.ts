import { test, expect } from "vitest";
import {
  buildCapabilities,
  readGridEnv,
  toGridStatus,
  toWebDriverTarget,
  validateBuildUrl,
} from "../providers/robotactions/utils";
import { DeviceOrientation, Platform } from "../types";

test("readGridEnv requires url and token", () => {
  expect(() => readGridEnv({})).toThrow(/ROBOTACTIONS_GRID_URL/);
  expect(() => readGridEnv({ ROBOTACTIONS_GRID_URL: "x" })).toThrow(
    /ROBOTACTIONS_TOKEN/,
  );
});

test("readGridEnv normalizes urls and rejects non-http", () => {
  const env = readGridEnv({
    ROBOTACTIONS_GRID_URL: "https://grid.robotactions.com/",
    ROBOTACTIONS_TOKEN: "t",
    ROBOTACTIONS_API_URL: "http://192.168.2.32:3001/",
  });
  expect(env.gridUrl).toBe("https://grid.robotactions.com");
  expect(env.apiUrl).toBe("http://192.168.2.32:3001");
  expect(
    readGridEnv({
      ROBOTACTIONS_GRID_URL: "https://grid.robotactions.com/",
      ROBOTACTIONS_TOKEN: "t",
    }).apiUrl,
  ).toBe("https://grid.robotactions.com");
  expect(() =>
    readGridEnv({ ROBOTACTIONS_GRID_URL: "ws://x", ROBOTACTIONS_TOKEN: "t" }),
  ).toThrow(/http\(s\)/);
});

test("toWebDriverTarget fills default ports and keeps a path prefix", () => {
  expect(toWebDriverTarget("https://grid.robotactions.com")).toEqual({
    protocol: "https",
    hostname: "grid.robotactions.com",
    port: 443,
    path: "/",
  });
  expect(toWebDriverTarget("http://192.168.2.32:5555/wd/hub/")).toEqual({
    protocol: "http",
    hostname: "192.168.2.32",
    port: 5555,
    path: "/wd/hub",
  });
});

test("validateBuildUrl only accepts http(s) urls", () => {
  expect(validateBuildUrl("https://ci.example/app.apk")).toBe(
    "https://ci.example/app.apk",
  );
  expect(() => validateBuildUrl("app-release.apk")).toThrow(/http\(s\) URL/);
  expect(() => validateBuildUrl(undefined)).toThrow(/Build path not found/);
});

test("buildCapabilities maps config to appium caps", () => {
  const caps = buildCapabilities({
    platform: Platform.IOS,
    device: {
      provider: "robotactions",
      udid: "00008101-000A",
      name: "iPhone 15",
      osVersion: "17.5",
      orientation: DeviceOrientation.LANDSCAPE,
      capabilities: { "appium:fullReset": false, "appium:noReset": true },
    },
    buildUrl: "https://ci.example/app.ipa",
    projectName: "ios",
  });
  expect(caps).toMatchObject({
    platformName: "ios",
    "appium:automationName": "xcuitest",
    "appium:app": "https://ci.example/app.ipa",
    "appium:udid": "00008101-000A",
    "appium:deviceName": "iPhone 15",
    "appium:platformVersion": "17.5",
    "appium:orientation": "LANDSCAPE",
    "appium:fullReset": false,
    "appium:noReset": true,
    "ra:testsuite": "AppWright ios",
  });
  expect(caps).not.toHaveProperty("appium:appWaitActivity");
});

test("buildCapabilities omits unset optional fields", () => {
  const caps = buildCapabilities({
    platform: Platform.ANDROID,
    device: { provider: "robotactions", testSuite: "Smoke" },
    buildUrl: "https://ci.example/app.apk",
    projectName: "android",
  });
  expect(caps["appium:automationName"]).toBe("uiautomator2");
  expect(caps["appium:appWaitActivity"]).toBe("*");
  expect(caps["ra:testsuite"]).toBe("Smoke");
  expect(caps).not.toHaveProperty("appium:udid");
  expect(caps).not.toHaveProperty("appium:platformVersion");
  expect(caps).not.toHaveProperty("appium:orientation");
});

test("toGridStatus collapses playwright statuses", () => {
  expect(toGridStatus("passed")).toBe("passed");
  expect(toGridStatus("failed")).toBe("failed");
  expect(toGridStatus("timedOut")).toBe("failed");
  expect(toGridStatus("interrupted")).toBe("failed");
  expect(toGridStatus("skipped")).toBeUndefined();
  expect(toGridStatus(undefined)).toBeUndefined();
});
