import { TestInfo } from "@playwright/test";
import { Device } from "../../types";
import { BrowserStackDevice } from "./browserstack";

export class DeviceProvider {
  static async getDevice(testInfo: TestInfo): Promise<Device> {
    const device = new BrowserStackDevice(testInfo);
    await device.init();
    return device;
  }
}
