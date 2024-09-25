import { TestInfo } from "@playwright/test";
import { IDeviceProvider } from "../types";
import { BrowserStackDeviceProvider } from "./browserstack";

export class DeviceProvider {
  static getInstance(testInfo: TestInfo): IDeviceProvider {
    return new BrowserStackDeviceProvider(testInfo);
  }
}
