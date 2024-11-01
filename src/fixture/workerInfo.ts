import fs from "fs";
import path from "path";
import { basePath } from "../utils";

type TestInWorkerInfo = {
  title: string;
  startTime: string;
};

type WorkerInfo = {
  idx: number;
  sessionId?: string | undefined;
  providerName?: string | undefined;
  startTime?:
    | {
        // Dates stored as ISO datetime strings
        beforeAppiumSession: string;
        afterAppiumSession: string;
      }
    | undefined;
  endTime?: string | undefined;
  tests: TestInWorkerInfo[];
};

export class WorkerInfoStore {
  private basePath: string;

  constructor() {
    this.basePath = basePath();
  }

  async saveWorkerToDisk(idx: number, contents: WorkerInfo) {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath);
    }
    // TODO: can we make this file path unique for a session?
    // will avoidd ios/android running into issues when running concurrently on local
    fs.writeFileSync(
      path.join(this.basePath, `worker-info-${idx}.json`),
      JSON.stringify(contents, null, 2),
    );
  }

  async getWorkerFromDisk(idx: number): Promise<WorkerInfo | undefined> {
    const filePath = path.join(this.basePath, `worker-info-${idx}.json`);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as WorkerInfo;
  }

  async getWorkerStartTime(idx: number) {
    const info = await this.getWorkerFromDisk(idx);
    if (!info || !info.startTime) {
      throw new Error(`Worker start time info is not available.`);
    }
    return new Date(info.startTime.afterAppiumSession);
  }

  async getWorkerEndTime(idx: number): Promise<Date | undefined> {
    const info = await this.getWorkerFromDisk(idx);
    if (info && info.endTime) {
      return new Date(info.endTime);
    }
  }

  async saveWorkerStartTime(
    idx: number,
    sessionId: string,
    providerName: string,
    beforeAppiumSession: Date,
    afterAppiumSession: Date,
  ) {
    let info = await this.getWorkerFromDisk(idx);
    if (!info) {
      info = {
        idx,
        providerName,
        sessionId,
        startTime: {
          beforeAppiumSession: beforeAppiumSession.toISOString(),
          afterAppiumSession: afterAppiumSession.toISOString(),
        },
        tests: [],
      };
    } else {
      info.startTime = {
        beforeAppiumSession: beforeAppiumSession.toISOString(),
        afterAppiumSession: afterAppiumSession.toISOString(),
      };
    }
    return this.saveWorkerToDisk(idx, info);
  }

  async saveWorkerEndTime(idx: number, endTime: Date) {
    let info = await this.getWorkerFromDisk(idx);
    if (!info) {
      throw new Error(`Worker info not found for idx: ${idx}`);
    }
    info.endTime = endTime.toISOString();
    return this.saveWorkerToDisk(idx, info);
  }

  async saveTestStartTime(idx: number, testTitle: string, startTime: Date) {
    let info = await this.getWorkerFromDisk(idx);
    if (!info) {
      info = {
        idx,
        tests: [{ title: testTitle, startTime: startTime.toISOString() }],
      };
    } else {
      info.tests.push({
        title: testTitle,
        startTime: startTime.toISOString(),
      });
    }
    return this.saveWorkerToDisk(idx, info);
  }
}
