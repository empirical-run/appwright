import { ChildProcess, spawn } from "child_process";

export function startAppiumServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const appiumCommand = "appium";

    const appiumProcess = spawn(appiumCommand, [], {
      stdio: "pipe",
    });

    appiumProcess.stdout.on("data", (data: Buffer) => {
      const output = data.toString();
      console.log(output);

      if (output.includes("Appium REST http interface listener started")) {
        console.log("Appium server is up and running.");
        resolve(appiumProcess);
      }
    });

    appiumProcess.on("error", (error) => {
      console.log("Error starting Appium server:", error);
      reject(error);
    });

    process.on("exit", () => {
      console.log("Main process exiting. Killing Appium server...");
      appiumProcess.kill();
    });

    appiumProcess.on("close", (code: number) => {
      console.log(`Appium server exited with code ${code}`);
    });
  });
}
