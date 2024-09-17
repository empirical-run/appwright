import { AppwrightLocator } from "../../../locator";

export interface IAppwrightDriver {
  close: () => Promise<void>;

  tapAtGivenCoordinates: ({ x, y }: { x: number; y: number }) => Promise<void>;

  getByText: (text: string, options?: { exact?: boolean }) => AppwrightLocator;

  getById: (text: string, options?: { exact?: boolean }) => AppwrightLocator;

  getByXpath: (xpath: string) => AppwrightLocator;

  getClipboard: () => Promise<string>;

  isAndroid: () => boolean;
}

export type WaitUntilOptions = {
  timeout?: number;
  timeoutMsg?: string;
  interval?: number;
};

export enum WebdriverErrors {
  StaleElementReferenceError = "stale element reference",
}
