import { BrowserStackDeviceProvider } from "./browserstack";
import { AppwrightConfig, DeviceProvider } from "../types";
import { LocalDeviceProvider } from "./local";
import { EmulatorProvider } from "./emulator";
import { FullProject } from "@playwright/test";
import { LambdaTestDeviceProvider } from "./lambdatest";

export function createDeviceProvider(
  project: FullProject<AppwrightConfig>,
): DeviceProvider {
  const provider = project.use.device?.provider;
  const appBundleId = project.use.appBundleId;
  switch (provider) {
    case "browserstack":
      return new BrowserStackDeviceProvider(project, appBundleId);
    case "lambdatest":
      return new LambdaTestDeviceProvider(project, appBundleId);
    case "emulator":
      return new EmulatorProvider(project, appBundleId);
    case "local-device":
      return new LocalDeviceProvider(project, appBundleId);
    default:
      throw new Error(`Unknown device provider: ${provider}`);
  }
}
