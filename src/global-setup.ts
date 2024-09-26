import { type FullConfig } from "@playwright/test";
import { AppwrightConfig } from "./types";
import { createDeviceProvider } from "./providers";

async function globalSetup(config: FullConfig<AppwrightConfig>) {
  const length = config.projects.length;
  for (let i = 0; i < length; i++) {
    const project = config.projects[i]!;
    const provider = createDeviceProvider(project);
    await provider.globalSetup?.();
  }
}

export default globalSetup;
