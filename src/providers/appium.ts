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
    appiumProcess.stderr.on("data", async (data: Buffer) => {
      console.log(data.toString());
    });
    appiumProcess.stdout.on("data", async (data: Buffer) => {
      const output = data.toString();
      console.log(output);

      if (output.includes("Error: listen EADDRINUSE")) {
        // TODO: Kill the appium server if it is already running
        logger.error(`Appium: ${data}`);
        throw new Error(
          `Appium server is already running. Please stop the server before running tests.`,
        );
      }

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

export function stopAppiumServer() {
  return new Promise((resolve, reject) => {
    exec(`pkill -f appium`, (error, stdout) => {
      if (error) {
        logger.error(`Error stopping Appium server: ${error.message}`);
        reject(error);
      }
      logger.log("Appium server stopped successfully.");
      resolve(stdout);
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

export async function getConnectedIOSDeviceUDID(): Promise<string> {
  try {
    const { stdout } = await execPromise(`xcrun xctrace list devices`);

    const iphoneDevices = stdout
      .split("\n")
      .filter((line) => line.includes("iPhone"));

    const realDevices = iphoneDevices.filter(
      (line) => !line.includes("Simulator"),
    );

    if (!realDevices.length) {
      throw new Error(
        `No connected iPhone detected. Please ensure your device is connected and try again.`,
      );
    }

    const deviceLine = realDevices[0];
    //the output from above looks like this: User’s iPhone (18.0) (00003110-002A304e3A53C41E)
    //where `00003110-000A304e3A53C41E` is the UDID of the device
    const matches = deviceLine!.match(/\(([\da-fA-F-]+)\)$/);

    if (matches && matches[1]) {
      return matches[1];
    } else {
      throw new Error(
        `Please check your iPhone device connection. 
To check for connected devices run "xcrun xctrace list devices | grep iPhone | grep -v Simulator"`,
      );
    }
  } catch (error) {
    //@ts-ignore
    throw new Error(`getConnectedIOSDeviceUDID: ${error.message}`);
  }
}

export async function getActiveAndroidDevices(): Promise<number> {
  try {
    const { stdout } = await execPromise("adb devices");

    const lines = stdout.trim().split("\n");

    const deviceLines = lines.filter((line) => line.includes("\tdevice"));

    return deviceLines.length;
  } catch (error) {
    throw new Error(
      //@ts-ignore
      `getActiveAndroidDevices: ${error.message}`,
    );
  }
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
    logger.error(`getLatestBuildToolsVersion: ${err}`);
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
      logger.error(`getApkDetails: ${stderr}`);
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
