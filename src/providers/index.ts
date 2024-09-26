import { BrowserStackDeviceProvider } from "./browserstack";
import { AppwrightConfig, DeviceProvider } from "../types";
import { LocalDeviceProvider } from "./local";
import { EmulatorProvider } from "./emulator";
import { FullProject } from "@playwright/test";

export function createDeviceProvider(
  project: FullProject<AppwrightConfig>,
): DeviceProvider {
  const provider = project.use.device?.provider;
  switch (provider) {
    case "browserstack":
      return new BrowserStackDeviceProvider(project);
    case "emulator":
      return new EmulatorProvider(project);
    case "local-device":
      return new LocalDeviceProvider(project);
    default:
      throw new Error(`Unknown device provider: ${provider}`);
  }
}
