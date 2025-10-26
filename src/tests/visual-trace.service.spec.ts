import { describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import type { TestInfo } from "@playwright/test";
import { VisualTraceService } from "../visualTrace";

const fakePngBase64 = Buffer.from("fake-image").toString("base64");
const otherPngBase64 = Buffer.from("other-image").toString("base64");

function createTestInfo(
  outputDir: string,
  onAttach: (name: string, options: any) => void,
  overrides?: Partial<TestInfo>,
) {
  return {
    outputDir,
    attach: async (name: string, options: any) => {
      onAttach(name, options);
    },
    outputPath: (fileName: string) => path.join(outputDir, fileName),
    ...overrides,
  } as unknown as TestInfo;
}

describe("VisualTraceService", () => {
  it("writes screenshot attachment when enabled", async () => {
    const outputDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "visual-trace-enabled-"),
    );
    const attachments: Array<{ name: string; path: string }> = [];
    const testInfo = createTestInfo(outputDir, (name, options) => {
      attachments.push({ name, path: options.path });
    });
    const service = new VisualTraceService({ enableScreenshots: true });

    await service.captureActionEnd({
      stepTitle: 'device.tap("Login")',
      methodName: "tap",
      testInfo,
      takeScreenshot: async () => fakePngBase64,
    });

    expect(attachments).toHaveLength(1);
    expect(attachments[0]?.name).toBe('device.tap("Login")');
    expect(fs.existsSync(attachments[0]!.path)).toBe(true);
    const directoryContents = await fs.promises.readdir(
      path.join(outputDir, "visual-trace"),
    );
    expect(directoryContents.length).toBe(1);

    await fs.promises.rm(outputDir, { recursive: true, force: true });
  });

  it("skips capture when disabled", async () => {
    const outputDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "visual-trace-disabled-"),
    );
    const onAttach = vi.fn();
    const testInfo = createTestInfo(outputDir, onAttach);
    const service = new VisualTraceService({ enableScreenshots: false });

    await service.captureActionEnd({
      stepTitle: "device.scroll()",
      methodName: "scroll",
      testInfo,
      takeScreenshot: async () => fakePngBase64,
    });

    expect(onAttach).not.toHaveBeenCalled();
    const exists = fs.existsSync(path.join(outputDir, "visual-trace"));
    expect(exists).toBe(false);

    await fs.promises.rm(outputDir, { recursive: true, force: true });
  });

  it("dedupes duplicate screenshots by default", async () => {
    const outputDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "visual-trace-dedupe-"),
    );
    const attachments: Array<{ name: string; path: string }> = [];
    const testInfo = createTestInfo(
      outputDir,
      (name, options) => {
        attachments.push({ name, path: options.path });
      },
      { testId: "dedupe-test" } as Partial<TestInfo>,
    );
    const service = new VisualTraceService({ enableScreenshots: true });

    await service.captureActionEnd({
      stepTitle: "device.tap()",
      methodName: "tap",
      testInfo,
      takeScreenshot: async () => fakePngBase64,
    });

    await service.captureActionEnd({
      stepTitle: "device.tap()",
      methodName: "tap",
      testInfo,
      takeScreenshot: async () => fakePngBase64,
    });

    expect(attachments).toHaveLength(1);
    await fs.promises.rm(outputDir, { recursive: true, force: true });
  });

  it("respects maxScreenshotsPerTest", async () => {
    const outputDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "visual-trace-max-"),
    );
    const attachments: string[] = [];
    const testInfo = createTestInfo(
      outputDir,
      (name, options) => {
        attachments.push(options.path);
      },
      { testId: "limit-test" } as Partial<TestInfo>,
    );
    const service = new VisualTraceService({
      enableScreenshots: true,
      maxScreenshotsPerTest: 1,
    });

    await service.captureActionEnd({
      stepTitle: "step-1",
      methodName: "tap",
      testInfo,
      takeScreenshot: async () => fakePngBase64,
    });

    await service.captureActionEnd({
      stepTitle: "step-2",
      methodName: "tap",
      testInfo,
      takeScreenshot: async () => otherPngBase64,
    });

    expect(attachments).toHaveLength(1);
    await fs.promises.rm(outputDir, { recursive: true, force: true });
  });
});
