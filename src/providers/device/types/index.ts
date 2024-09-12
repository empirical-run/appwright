import { AppwrightDriver } from "../../driver";

export interface Device {
  init: () => Promise<void>;

  createDriver: () => Promise<AppwrightDriver>;

  // TODO: Return error type
  downloadVideo: () => Promise<{ path: string; contentType: string } | null>;

  setSessionStatus: (status?: string, reason?: string) => Promise<void>;
}

export type BrowserstackSessionDetails = {
  name: string;
  duration: number;
  os: string;
  os_version: string;
  device: string;
  status: string;
  reason: string;
  build_name: string;
  project_name: string;
  logs: string;
  public_url: string;
  appium_logs_url: string;
  video_url: string;
  device_logs_url: string;
  app_details: {
    app_url: string;
    app_name: string;
    app_version: string;
    app_custom_id: string;
    uploaded_at: string;
  };
};

export type DeviceSessionConfig = {
  platform: Platform;
  deviceName: string;
  osVersion: string;
  buildURL: string;
  projectName: string;
};

export enum Platform {
  ANDROID = "Android",
  IOS = "iOS",
}
