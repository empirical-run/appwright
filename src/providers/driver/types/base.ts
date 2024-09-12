export interface IAppwrightDriver {
  fill: (
    path: string,
    value: string,
    options: { timeout?: number },
  ) => Promise<void>;

  isElementVisibleWithinTimeout: (
    path: string,
    options?: WaitUntilOptions,
  ) => Promise<boolean>;

  close: () => Promise<void>;

  click: (path: string, options?: WaitUntilOptions) => Promise<void>;

  tapAtGivenCoordinates: ({ x, y }: { x: number; y: number }) => Promise<void>;

  getClipboard: () => Promise<string>;

  isAndroid: () => boolean;
}

export type WaitUntilOptions = {
  timeout?: number;
  timeoutMsg?: string;
  interval?: number;
};

export enum webdriverErrors {
  StaleElementReferenceError = "stale element reference",
}
