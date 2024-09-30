import { ChildProcess, spawn, exec } from "child_process";
import path from "path";
import { Platform } from "../types";
import { logger } from "../logger";
import fs from "fs/promises";
import { promisify } from "util";
import { getLatestBuildToolsVersions } from "../utils";

const execPromise = promisify(exec);

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

async function getLatestBuildToolsVersion(): Promise<string | undefined> {
  const androidHome = process.env.ANDROID_HOME;
  const buildToolsPath = path.join(androidHome!, "build-tools");
  try {
    const files = await fs.readdir(buildToolsPath);

    const versions = files.filter((file) =>
      /^\d+\.\d+\.\d+(-rc\d+)?$/.test(file),
    );

    if (versions.length === 0) {
      throw new Error(
        `No valid build-tools found in ${buildToolsPath}. Please download from Android Studio: https://developer.android.com/studio/intro/update#required`,
      );
    }

    return getLatestBuildToolsVersions(versions);
  } catch (err) {
    console.error(`getLatestBuildToolsVersion: ${err}`);
    throw new Error(
      `Error reading ${buildToolsPath}. Ensure it exists or download from Android Studio: https://developer.android.com/studio/intro/update#required`,
    );
  }
}

export async function getApkDetails(buildPath: string): Promise<{
  packageName: string | undefined;
  launchableActivity: string | undefined;
}> {
  const androidHome = process.env.ANDROID_HOME;
  const buildToolsVersion = await getLatestBuildToolsVersion();

  if (!buildToolsVersion) {
    throw new Error(
      `No valid build-tools found in ${buildToolsVersion}. Please download from Android Studio: https://developer.android.com/studio/intro/update#required`,
    );
  }

  const aaptPath = path.join(
    androidHome!,
    "build-tools",
    buildToolsVersion!,
    "aapt",
  );
  const command = `${aaptPath} dump badging ${buildPath}`;

  try {
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error(`getApkDetails: ${stderr}`);
      throw new Error(`Error executing aapt: ${stderr}`);
    }

    const packageMatch = stdout.match(/package: name='(\S+)'/);
    const activityMatch = stdout.match(/launchable-activity: name='(\S+)'/);

    if (!packageMatch || !activityMatch) {
      throw new Error(
        `Unable to retrieve package or launchable activity from the APK. Please verify that the provided file is a valid APK.`,
      );
    }

    const packageName = packageMatch[1];
    const launchableActivity = activityMatch[1];

    return { packageName, launchableActivity };
  } catch (error: any) {
    throw new Error(`getApkDetails: ${error.message}`);
  }
}
