import { BrowserStackDeviceProvider } from "./browserstack";
import { AppwrightConfig, DeviceProvider } from "../types";
import { FullProject } from "@playwright/test";

export function createDeviceProvider(
  project: FullProject<AppwrightConfig>,
): DeviceProvider {
  return new BrowserStackDeviceProvider(project);
}
