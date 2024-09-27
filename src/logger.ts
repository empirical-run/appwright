import { cyan, red, yellow } from "picocolors";

class CustomLogger {
  log(...args: any[]) {
    console.log(cyan("[INFO]"), ...args);
  }

  warn(...args: any[]) {
    console.log(yellow("[WARN]"), ...args);
  }

  error(...args: any[]) {
    console.log(red("[ERROR]"), ...args);
  }

  logEmptyLine() {
    console.log("\n\n");
  }
}

export const logger = new CustomLogger();
