import { ChildProcess, spawn, exec } from "child_process";
import path from "path";
import { Platform } from "../types";
import { logger } from "../logger";
import fs from "fs/promises";

export async function installDriver(driverName: string): Promise<void> {
  // uninstall the driver first to avoid conflicts
  await new Promise((resolve) => {
    const installProcess = spawn(
      "npx",
      ["appium", "driver", "uninstall", driverName],
      {
        stdio: "pipe",
      },
    );
    installProcess.on("exit", (code) => {
      resolve(code);
    });
  });
  // install the driver
  await new Promise((resolve) => {
    const installProcess = spawn(
      "npx",
      ["appium", "driver", "install", driverName],
      {
        stdio: "pipe",
      },
    );
    installProcess.on("exit", (code) => {
      resolve(code);
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
        logger.log("Appium server is up and running.");
        resolve(appiumProcess);
      }
    });

    appiumProcess.on("error", (error) => {
      logger.error(`Appium: ${error}`);
      reject(error);
    });

    process.on("exit", () => {
      logger.log("Main process exiting. Killing Appium server...");
      appiumProcess.kill();
    });

    appiumProcess.on("close", (code: number) => {
      logger.log(`Appium server exited with code ${code}`);
    });
  });
}

export function isEmulatorInstalled(platform: Platform): Promise<boolean> {
  return new Promise((resolve) => {
    if (platform == Platform.ANDROID) {
      const androidHome = process.env.ANDROID_HOME;

      const emulatorPath = path.join(androidHome!, "emulator", "emulator");
      exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
        if (error) {
          throw new Error(
            `Error fetching emulator list.\nPlease install emulator from Android SDK Tools.
Follow this guide to install emulators: https://community.neptune-software.com/topics/tips--tricks/blogs/how-to-install--android-emulator-without--android--st`,
          );
        }
        if (stderr) {
          logger.error(`Emulator: ${stderr}`);
        }

        const lines = stdout.trim().split("\n");

        const deviceNames = lines.filter(
          (line) =>
            line.trim() && !line.startsWith("INFO") && !line.includes("/tmp/"),
        );

        if (deviceNames.length > 0) {
          resolve(true);
        } else {
          throw new Error(
            `No installed emulators found.
Follow this guide to install emulators: https://community.neptune-software.com/topics/tips--tricks/blogs/how-to-install--android-emulator-without--android--st`,
          );
        }
      });
    }
  });
}

export async function startAndroidEmulator(): Promise<void> {
  return new Promise((resolve, reject) => {
    const androidHome = process.env.ANDROID_HOME;

    const emulatorPath = path.join(androidHome!, "emulator", "emulator");

    exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
      if (error) {
        throw new Error(
          `Error fetching emulator list.\nPlease install emulator from Android SDK Tools.\nFollow this guide to install emulators: https://community.neptune-software.com/topics/tips--tricks/blogs/how-to-install--android-emulator-without--android--st`,
        );
      }
      if (stderr) {
        logger.error(`Emulator: ${stderr}`);
      }

      const lines = stdout.trim().split("\n");

      // Filter out lines that do not contain device names
      const deviceNames = lines.filter(
        (line) =>
          line.trim() && !line.startsWith("INFO") && !line.includes("/tmp/"),
      );

      if (deviceNames.length === 0) {
        throw new Error(
          `No installed emulators found.\nFollow this guide to install emulators: https://community.neptune-software.com/topics/tips--tricks/blogs/how-to-install--android-emulator-without--android--st`,
        );
      } else {
        logger.log(`Available Emulators: ${deviceNames}`);
      }

      const emulatorToStart = deviceNames[0];

      const emulatorProcess = spawn(emulatorPath, ["-avd", emulatorToStart!], {
        stdio: "pipe",
      });

      emulatorProcess.stdout?.on("data", (data) => {
        logger.log(`Emulator: ${data}`);

        if (data.includes("Successfully loaded snapshot 'default_boot'")) {
          logger.log("Emulator started successfully.");
          resolve();
        }
      });

      emulatorProcess.on("error", (err) => {
        logger.error(`Emulator: ${err.message}`);
        reject(`Failed to start emulator: ${err.message}`);
      });

      emulatorProcess.on("close", (code) => {
        if (code !== 0) {
          reject(`Emulator process exited with code: ${code}`);
        }
      });

      // Ensure the emulator process is killed when the main process exits
      process.on("exit", () => {
        logger.log("Main process exiting. Killing the emulator process...");
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
        logger.error("osascript:", error.message);
        return reject(error);
      }

      if (stderr) {
        logger.error(`osascript: ${stderr}`);
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

async function getLatestBuildToolsVersion(
  androidHome: string,
): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const buildToolsPath = path.join(androidHome, "build-tools");

    fs.readdir(buildToolsPath, (err, files) => {
      if (err) {
        console.error(`getLatestBuildToolsVersion: ${err}`);
        return reject("Error reading build-tools directory");
      }

      // Filter out files that are not valid build-tools versions (directories with version numbers)
      const versions = files.filter((file) =>
        /^\d+\.\d+\.\d+(-rc\d+)?$/.test(file),
      );

      if (versions.length === 0) {
        return reject("No valid build-tools version found");
      }

      const latestVersion = versions.sort((a, b) => (a > b ? -1 : 1))[0];
      resolve(latestVersion);
    });
  });
}

export async function getApkDetails(buildPath: string): Promise<{
  packageName: string | undefined;
  launchableActivity: string | undefined;
}> {
  const buildToolsVersion = await getLatestBuildToolsVersion(
    process.env.ANDROID_HOME!,
  );
  if (!buildToolsVersion) {
    throw new Error("Failed to get latest build tools version");
  }
  return new Promise((resolve, reject) => {
    const androidHome = process.env.ANDROID_HOME;

    const aaptPath = path.join(
      androidHome!,
      "build-tools",
      buildToolsVersion!,
      "aapt",
    );
    const command = `${aaptPath} dump badging ${buildPath}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error(`getApkDetails: ${error.message}`);
        return reject(new Error(`Error executing aapt: ${stderr}`));
      }

      const packageMatch = stdout.match(/package: name='(\S+)'/);
      const activityMatch = stdout.match(/launchable-activity: name='(\S+)'/);

      if (!packageMatch || !activityMatch) {
        return reject(
          "Unable to find package or launchable activity in the APK. Please check the APK and try again.",
        );
      }

      const packageName = packageMatch[1];
      const launchableActivity = activityMatch[1];

      resolve({ packageName, launchableActivity });
    });
  });
}
