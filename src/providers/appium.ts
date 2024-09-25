import { ChildProcess, spawn, exec } from "child_process";
import path from "path";

export function startAppiumServer(provider: string): Promise<ChildProcess> {
  let isEmulatorStarted = false;
  return new Promise((resolve, reject) => {
    const appiumProcess = spawn("npx", ["appium"], {
      stdio: "pipe",
    });

    appiumProcess.stdout.on("data", async (data: Buffer) => {
      const output = data.toString();
      console.log(output);

      if (output.includes("Could not find online devices")) {
        if (!isEmulatorStarted && provider == "emulator") {
          isEmulatorStarted = true;
          await startAndroidEmulator();
        }
        resolve(appiumProcess);
      }

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

async function startAndroidEmulator(deviceName?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const androidHome = process.env.ANDROID_HOME;

    if (!androidHome) {
      return reject("ANDROID_HOME environment variable is not set.");
    }

    const emulatorPath = path.join(androidHome, "emulator", "emulator");

    //@ts-ignore
    exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
      if (error) {
        return reject(`Error fetching emulator list: ${error.message}`);
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }

      const devices = stdout.trim().split("\n");
      console.log(`Available emulators: ${devices.join(", ")}\n\n`);

      if (devices.length === 1) {
        return reject("No available emulators found.");
      }

      /* Getting this at the 0th index:
       *  INFO | Storing crashdata : detection is enabled for process:
       */
      const emulatorToStart = deviceName || devices[1];

      const emulatorProcess = spawn(emulatorPath, ["-avd", emulatorToStart!]);

      emulatorProcess.stdout?.on("data", (data) => {
        console.log(`Emulator output: ${data}`);
      });

      emulatorProcess.stderr?.on("data", (data) => {
        console.error(`Emulator error: ${data}`);
      });

      emulatorProcess.on("error", (err) => {
        reject(`Failed to start emulator: ${err.message}`);
      });

      emulatorProcess.on("close", (code) => {
        if (code !== 0) {
          reject(`Emulator process exited with code: ${code}`);
        }
      });

      // Ensure the emulator process is killed when the main process exits
      process.on("exit", () => {
        console.log("Main process exiting. Killing the emulator process...");
        emulatorProcess.kill();
      });
    });
  });
}

export function getAppBundleId(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = `osascript -e 'id of app "${path}"'`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing osascript: ${error.message}`);
        return reject(error);
      }

      if (stderr) {
        console.error(`Error: ${stderr}`);
        return reject(new Error(stderr));
      }

      const bundleId = stdout.trim();
      if (bundleId) {
        console.log(`Bundle ID: ${bundleId}`);
        resolve(bundleId);
      } else {
        reject(new Error("Bundle ID not found"));
      }
    });
  });
}
