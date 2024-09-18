import { AppwrightDriver } from "../../driver";

export interface Device {
  init: () => Promise<void>;
  createDriver: () => Promise<AppwrightDriver>;
  // TODO: Return error type
  downloadVideo: () => Promise<{ path: string; contentType: string } | null>;
  setSessionStatus: (status?: string, reason?: string) => Promise<void>;
}

export type AppWrightConfig = {
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
