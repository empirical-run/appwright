import { ChildProcess, spawn, exec } from "child_process";
import path from "path";
import { Platform } from "../types";

export function installDriver(driverName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const installProcess = spawn(
      "npx",
      ["appium", "driver", "install", driverName],
      {
        stdio: "pipe",
      },
    );

    installProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Failed to install ${driverName}, exited with code ${code}`,
          ),
        );
      }
    });

    installProcess.on("error", (error) => {
      console.error(`Install Driver: ${error.message}`);
      reject(error);
    });
  });
}

export function isDriverInstalled(driver: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const appiumProcess = spawn(
      "npx",
      ["appium", "driver", "list", "--installed"],
      {
        stdio: "pipe",
      },
    );

    let output = "";

    appiumProcess.stderr.on("data", (data: Buffer) => {
      output += data.toString();
    });

    appiumProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("Failed to check for installed appium drivers"));
      } else if (output.includes(driver)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    appiumProcess.on("error", (error) => {
      console.error(`Is driver installed: ${error.message}`);
      reject(error);
    });
  });
}

export async function startAppiumServer(
  provider: string,
): Promise<ChildProcess> {
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

export function isEmulatorInstalled(platform: Platform): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (platform == Platform.ANDROID) {
      const androidHome = process.env.ANDROID_HOME;

      const emulatorPath = path.join(androidHome!, "emulator", "emulator");
      exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
        if (error) {
          return reject(
            `Error fetching emulator list. Please install emulator from Android SDK Tools. Follow this guide to install emulators: https://developer.android.com/studio/run/managing-avds`,
          );
        }
        if (stderr) {
          console.error(`Emulator: ${stderr}`);
        }

        const lines = stdout.trim().split("\n");

        const deviceNames = lines.filter(
          (line) =>
            line.trim() && !line.startsWith("INFO") && !line.includes("/tmp/"),
        );

        if (deviceNames.length > 0) {
          resolve(true);
        } else {
          return reject(
            "No installed emulators found. Follow this guide to install emulators: https://developer.android.com/studio/run/emulator#avd",
          );
        }
      });
    } else {
      // TODO: Verify this method
      // exec("xcrun simctl list", (error, stdout, stderr) => {
      //   if (error) {
      //     // Throw explicit error if xcrun is not found or any error occurs
      //     return reject(
      //       new Error(
      //         `iPhone Simulator setup is missing or incomplete. Ensure that Xcode and its command-line tools are installed correctly. `,
      //       ),
      //     );
      //   }
      //   if (stderr) {
      //     console.error(stderr);
      //     return reject(
      //       new Error(
      //         "An unexpected error occurred while checking iPhone Simulator setup.",
      //       ),
      //     );
      //   }
      //   // Check if any simulators are listed
      //   if (!stdout.includes("iPhone")) {
      //     return reject(
      //       new Error(
      //         "No iPhone simulators found. Please ensure that Xcode is properly configured with iPhone simulators.",
      //       ),
      //     );
      //   }
      //   // If everything is set up correctly
      //   console.log("iPhone Simulator setup is complete.");
      //   resolve(true);
      // });
    }
  });
}

export async function startAndroidEmulator(): Promise<void> {
  return new Promise((resolve, reject) => {
    const androidHome = process.env.ANDROID_HOME;

    const emulatorPath = path.join(androidHome!, "emulator", "emulator");

    exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
      if (error) {
        return reject(
          `Error fetching emulator list. Please install emulator from Android SDK Tools. Follow this guide to install emulators: https://developer.android.com/studio/run/managing-avds`,
        );
      }
      if (stderr) {
        console.error(`Emulator: ${stderr}`);
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
        console.error("osascript:", error.message);
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
