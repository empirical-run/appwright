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
    for (let i = 0; i < config.projects.length; i++) {
      projects.push(config.projects[i]!.name);
    }
  }

  const length = projects.length;
  for (let i = 0; i < length; i++) {
    const project = config.projects.find(
      (project) => project.name === projects[i],
    );
    if (project) {
      const provider = createDeviceProvider(project);
      await provider.globalSetup?.();
    }
  }
}

export default globalSetup;
