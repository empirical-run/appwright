import { type FullConfig } from "@playwright/test";
import { AppwrightConfig } from "./types";
import { createDeviceProvider } from "./providers";

async function globalSetup(config: FullConfig<AppwrightConfig>) {
  const projectIndex = process.argv.findIndex((arg) => arg === "--project");

  const projectName =
    projectIndex !== -1 ? process.argv[projectIndex + 1] : undefined;

  console.log(`Using project: ${projectName}`);
  if (!projectName) {
    throw new Error(
      `No project specified. Please pass --project <project-name>.`,
    );
  }

  const project = config.projects.find((p) => p.name === projectName);
  if (!project) {
    throw new Error(
      `Project "${projectName}" does not match any project from the configuration.
Please check the project name in appwright.config.ts.`,
    );
  }

  const provider = createDeviceProvider(project);
  await provider.globalSetup?.();
}

export default globalSetup;
