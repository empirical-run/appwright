import { ChildProcess, spawn, exec } from "child_process";
import path from "path";

export function startAppiumServer(provider: string): Promise<ChildProcess> {
  let emulatorStartRequested = false;
  return new Promise((resolve, reject) => {
    const appiumProcess = spawn("npx", ["appium"], {
      stdio: "pipe",
    });

    appiumProcess.stdout.on("data", async (data: Buffer) => {
      const output = data.toString();
      if (output.includes("Could not find online devices")) {
        if (!emulatorStartRequested && provider == "emulator") {
          emulatorStartRequested = true;
          await startAndroidEmulator();
        }
      }

      if (output.includes("Appium REST http interface listener started")) {
        console.log("Appium server is up and running.");
        resolve(appiumProcess);
      }
    });

    appiumProcess.on("error", (error) => {
      console.error(`Appium: ${error}`);
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

async function startAndroidEmulator(): Promise<void> {
  return new Promise((resolve, reject) => {
    const androidHome = process.env.ANDROID_HOME;

    if (!androidHome) {
      return reject(
        "The ANDROID_HOME environment variable is not set. This variable is required to locate your Android SDK. Please set it to the correct path of your Android SDK installation. For detailed instructions on how to set up the Android SDK path, visit: https://developer.android.com/tools/variables#envar",
      );
    }

    const emulatorPath = path.join(androidHome, "emulator", "emulator");

    exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
      if (error) {
        return reject(`Error fetching emulator list: ${error.message}`);
      }
      if (stderr) {
        console.error(stderr);
      }

      const lines = stdout.trim().split("\n");

      // Filter out lines that do not contain device names
      const deviceNames = lines.filter(
        (line) =>
          line.trim() && !line.startsWith("INFO") && !line.includes("/tmp/"),
      );

      if (deviceNames.length === 0) {
        return reject(
          "No installed emulators found. Follow this guide to install emulators: https://developer.android.com/studio/run/emulator#avd",
        );
      } else {
        console.log(`Available Emulators: ${deviceNames}`);
      }

      const emulatorToStart = deviceNames[0];

      const emulatorProcess = spawn(emulatorPath, ["-avd", emulatorToStart!], {
        stdio: "pipe",
      });

      emulatorProcess.stdout?.on("data", (data) => {
        console.log(`Emulator: ${data}`);

        if (data.includes("Successfully loaded snapshot 'default_boot'")) {
          console.log("Emulator started successfully.");
          resolve();
        }
      });

      emulatorProcess.stderr?.on("data", (data) => {
        console.error(`Emulator: ${data}`);
      });

      emulatorProcess.on("error", (err) => {
        console.error(`Emulator: ${err.message}`);
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
        console.error(error.message);
        return reject(error);
      }

      if (stderr) {
        console.error(`osascript: ${stderr}`);
        return reject(new Error(stderr));
      }

      const bundleId = stdout.trim();
      if (bundleId) {
        resolve(bundleId);
      } else {
        reject(new Error("Bundle ID not found"));
      }
    });
  });
}
