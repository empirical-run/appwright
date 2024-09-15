import { AppwrightDriver } from "../../driver";

export interface Device {
  init: () => Promise<void>;

  createDriver: () => Promise<AppwrightDriver>;

  // TODO: Return error type
  downloadVideo: () => Promise<{ path: string; contentType: string } | null>;

  setSessionStatus: (status?: string, reason?: string) => Promise<void>;
}

export type Config = {
  platform: Platform;
  deviceName: string;
  osVersion: string;
  buildURL: string;
};

export enum Platform {
  ANDROID = "android",
  IOS = "ios",
}
