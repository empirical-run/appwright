import { AppwrightLocator } from "../locator";
import { AppwrightDriver } from "../providers/driver";

export type WaitUntilOptions = {
  timeout: number;
};

export type TestInfoOptions = {
  expectTimeout: number;
};

export interface Device {
  init: () => Promise<void>;
  createDriver: () => Promise<AppwrightDriver>;
  // TODO: Return error type
  downloadVideo: () => Promise<{ path: string; contentType: string } | null>;
  setSessionStatus: (status?: string, reason?: string) => Promise<void>;
}

export type AppwrightConfig = {
  platform: Platform;
  deviceName: string;
  osVersion: string;
  buildURL: string;
  //TODO: use expect timeout from playwright config
  expectTimeout?: number;
};

export enum Platform {
  ANDROID = "android",
  IOS = "ios",
}

export interface IAppwrightDriver {
  close: () => Promise<void>;

  tapAtGivenCoordinates: ({ x, y }: { x: number; y: number }) => Promise<void>;

  getByText: (
    text: string | RegExp,
    options?: { exact?: boolean },
  ) => AppwrightLocator;

  getById: (
    text: string | RegExp,
    options?: { exact?: boolean },
  ) => AppwrightLocator;

  getByXpath: (xpath: string) => AppwrightLocator;

  getClipboard: () => Promise<string>;

  tapWithPrompt: (prompt: string) => Promise<void>;

  extractTextWithPrompt: (prompt: string) => Promise<string>;

  isAndroid: () => boolean;
}

export enum WebdriverErrors {
  StaleElementReferenceError = "stale element reference",
}
