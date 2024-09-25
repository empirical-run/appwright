import { BrowserStackDeviceProvider } from "./browserstack";
import { AppwrightConfig, DeviceProvider } from "../types";

export function createDeviceProvider(
  projectConfig: AppwrightConfig,
): DeviceProvider {
  return new BrowserStackDeviceProvider(projectConfig);
}
