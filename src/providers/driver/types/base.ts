export interface IAppwrightDriver {
  fill: (
    xpath: string,
    value: string,
    options: { timeout?: number },
  ) => Promise<void>;

  isElementVisibleWithinTimeout: (
    xpath: string,
    options?: WaitUntilOptions,
  ) => Promise<boolean>;

  close: () => Promise<void>;

  click: (xpath: string, options?: WaitUntilOptions) => Promise<void>;

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
