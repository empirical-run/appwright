import test from "@playwright/test";
import fs from "fs";

export function boxedStep(
  target: Function,
  context: ClassMethodDecoratorContext,
) {
  return function replacementMethod(
    this: {
      selector: string | RegExp;
    },
    ...args: any
  ) {
    const path = this.selector ? `("${this.selector}")` : "";
    const argsString = args.length
      ? "(" +
        Array.from(args)
          .map((a) => JSON.stringify(a))
          .join(" , ") +
        ")"
      : "";
    const name = `${context.name as string}${path}${argsString}`;
    return test.step(
      name,
      async () => {
        return await target.call(this, ...args);
      },
      { box: true },
    );
  };
}

export function validateBuildPath(
  buildPath: string,
  expectedExtension: string,
) {
  if (!buildPath) {
    throw new Error(
      `Build path not found. Please set the build path in the config file.`,
    );
  }

  if (!buildPath.endsWith(expectedExtension)) {
    throw new Error(
      `File path is not supported. Please provide ${expectedExtension} file path in the config file.`,
    );
  }

  if (!fs.existsSync(buildPath)) {
    throw new Error(
      `File not found at given path: ${buildPath}
Please provide the correct path of the file.`,
    );
  }
}
