import { type FullConfig } from "@playwright/test";
import { AppwrightConfig } from "./types";
import { createDeviceProvider } from "./providers";

async function globalSetup(config: FullConfig<AppwrightConfig>) {
  const args = process.argv;
  const projects: string[] = [];
  args.forEach((arg, index) => {
    if (arg === "--project") {
      const project = args[index + 1];
      if (project) {
        projects.push(project);
      } else {
        throw new Error("Project name is required with --project flag");
      }
    }
  });

  if (projects.length == 0) {
    // Capability to run all projects is not supported currently
    // This will be added after support for using same appium server for multiple projects is added
    throw new Error(
      "Capability to run all projects is not supported. Please specify the project name with --project flag.",
    );
  }

  for (let i = 0; i < config.projects.length; i++) {
    if (projects.includes(config.projects[i]!.name)) {
      const provider = createDeviceProvider(config.projects[i]!);
      await provider.globalSetup?.();
    }
  }
}

export default globalSetup;
