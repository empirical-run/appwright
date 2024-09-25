import { TestInfo } from "@playwright/test";
import { BrowserStackDeviceProvider } from "./browserstack";
import { DeviceProvider } from "../types";

export function createDeviceProvider(testInfo: TestInfo): DeviceProvider {
  return new BrowserStackDeviceProvider(testInfo);
}
