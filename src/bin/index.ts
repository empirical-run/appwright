#!/usr/bin/env node
import { spawn } from "child_process";

function cmd(
  command: string[],
  options: { env?: Record<string, string> },
): Promise<number> {
  let errorLogs: string[] = [];
  return new Promise((resolveFunc, rejectFunc) => {
    let p = spawn(command[0]!, command.slice(1), {
      env: { ...process.env, ...options.env },
    });
    p.stdout.on("data", (x) => {
      const log = x.toString();
      if (log.includes("Error")) {
        errorLogs.push(log);
      }
      process.stdout.write(log);
    });
    p.stderr.on("data", (x) => {
      const log = x.toString();
      process.stderr.write(x.toString());
      errorLogs.push(log);
    });
    p.on("exit", (code) => {
      if (code != 0) {
        // assuming last log is the error message before exiting
        rejectFunc(errorLogs.slice(-3).join("\n"));
      } else {
        resolveFunc(code!);
      }
    });
  });
}

async function runPlaywrightCmd(args: string) {
  const pwRunCmd = `npx playwright ${args}`;
  return cmd(pwRunCmd.split(" "), {});
}

(async function main() {
  const defaultConfigFile = `appwright.config.ts`;
  const pwOptions = process.argv.slice(2);
  if (!pwOptions.includes("--config")) {
    pwOptions.push(`--config`);
    pwOptions.push(defaultConfigFile);
  }
  try {
    await runPlaywrightCmd(pwOptions.join(" "));
  } catch (error: any) {
    console.error("Error while running playwright test:", error.message);
    process.exit(1);
  }
})();
