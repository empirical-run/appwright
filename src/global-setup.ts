import { type FullConfig } from "@playwright/test";
import { AppwrightConfig } from "./types";
import { BrowserStackDeviceProvider } from "./providers/browserstack";

async function globalSetup(config: FullConfig<AppwrightConfig>) {
  console.log("Global setup");

  const length = config.projects.length;
  for (let i = 0; i < length; i++) {
    const project = config.projects[i]!;
    // TODO: extract provider here when it is available
    // const provider = "browserstack";
    // createDeviceProvider(project);
    await BrowserStackDeviceProvider.globalSetup(
      project.use as AppwrightConfig,
    );
  }
}

export default globalSetup;
