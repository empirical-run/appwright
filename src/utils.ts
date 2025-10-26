import test from "@playwright/test";
import fs from "fs";
import path from "path";
import { VisualTraceService } from "./visualTrace";

export function boxedStep(
  target: Function,
  context: ClassMethodDecoratorContext,
) {
  return function replacementMethod(
    this: Record<string, any>,
    ...args: any
  ) {
    const selectorPath = this.selector ? `("${this.selector}")` : "";
    const argsString = args.length
      ? "(" +
        Array.from(args)
          .map((a) => JSON.stringify(a))
          .join(" , ") +
        ")"
      : "";
    const name = `${String(context.name)}${selectorPath}${argsString}`;
    const visualTraceService = this
      .visualTraceService as VisualTraceService | undefined;
    const driver = this.webDriverClient;
    const takeScreenshot =
      typeof driver?.takeScreenshot === "function"
        ? () => driver.takeScreenshot()
        : undefined;

    return test.step(
      name,
      async () => {
        const testInfo = test.info();
        try {
          return await target.call(this, ...args);
        } finally {
          if (typeof takeScreenshot === "function") {
            await visualTraceService?.captureActionEnd({
              stepTitle: name,
              methodName: String(context.name),
              testInfo,
              takeScreenshot,
            });
          }
        }
      },
      { box: true },
    );
  };
}

export function validateBuildPath(
  buildPath: string | undefined,
  expectedExtension: string,
) {
  if (!buildPath) {
    throw new Error(
      `Build path not found. Please set the build path in appwright.config.ts`,
    );
  }

  if (!buildPath.endsWith(expectedExtension)) {
    throw new Error(
      `File path is not supported for the given combination of platform and provider. Please provide build with ${expectedExtension} file extension in the appwright.config.ts`,
    );
  }

  if (!fs.existsSync(buildPath)) {
    throw new Error(
      `File not found at given path: ${buildPath}
Please provide the correct path of the build.`,
    );
  }
}

export function getLatestBuildToolsVersions(
  versions: string[],
): string | undefined {
  return versions.sort((a, b) => (a > b ? -1 : 1))[0];
}

export function longestDeterministicGroup(pattern: RegExp): string | undefined {
  const patternToString = pattern.toString();
  const matches = [...patternToString.matchAll(/\(([^)]+)\)/g)].map(
    (match) => match[1],
  );
  if (!matches || !matches.length) {
    return undefined;
  }
  const noSpecialChars: string[] = matches.filter((match): match is string => {
    if (!match) {
      return false;
    }
    const regexSpecialCharsPattern = /[.*+?^${}()|[\]\\]/;
    return !regexSpecialCharsPattern.test(match);
  });
  const longestString = noSpecialChars.reduce(
    (max, str) => (str.length > max.length ? str : max),
    "",
  );
  if (longestString == "") {
    return undefined;
  }
  return longestString;
}

export function basePath() {
  return path.join(process.cwd(), "playwright-report", "data", "videos-store");
}
