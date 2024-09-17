import { AppwrightLocator } from "../../../locator";
import { WaitUntilOptions } from "../../../types";

export interface IAppwrightDriver {
  fill: (
    path: string,
    value: string,
    options: WaitUntilOptions,
  ) => Promise<void>;

  isVisible: (path: string, options?: WaitUntilOptions) => Promise<boolean>;

  close: () => Promise<void>;

  click: (path: string, options?: WaitUntilOptions) => Promise<void>;

  tapAtGivenCoordinates: ({ x, y }: { x: number; y: number }) => Promise<void>;

  getByText: (text: string, options?: { exact?: boolean }) => AppwrightLocator;

  getById: (text: string, options?: { exact?: boolean }) => AppwrightLocator;

  getClipboard: () => Promise<string>;

  isAndroid: () => boolean;
}

export enum WebdriverErrors {
  StaleElementReferenceError = "stale element reference",
}
