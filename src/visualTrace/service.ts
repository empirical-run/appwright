import fs from "fs";
import path from "path";
import { randomUUID, createHash } from "crypto";
import type { TestInfo, TraceMode } from "@playwright/test";
import { VisualTraceConfig } from "../types";
import { logger } from "../logger";

const VISUAL_TRACE_DIR = "visual-trace";

type CaptureState = {
  count: number;
  hashes: Set<string>;
};

export type VisualCaptureContext = {
  /**
   * Human readable name of the step, already includes selector/arguments.
   */
  stepTitle: string;
  /**
   * Underlying method name being executed.
   */
  methodName: string;
  /**
   * Current Playwright test info — used for attachment paths.
   */
  testInfo: TestInfo;
  /**
   * Lazily invoked screenshot getter returning a base64 encoded PNG.
   */
  takeScreenshot: () => Promise<string>;
};

export class VisualTraceService {
  constructor(private readonly config?: VisualTraceConfig) {}

  private readonly stateByTestId = new Map<string, CaptureState>();

  async captureActionEnd(context: VisualCaptureContext): Promise<void> {
    if (!this.isEnabled(context)) {
      return;
    }
    try {
      const testId = context.testInfo.testId ?? context.testInfo.title;
      const attempt = context.testInfo.retry ?? 0;
      const stateKey = `${testId}#attempt-${attempt}`;
      const state = this.ensureState(stateKey);
      if (!this.canCapture(state)) {
        return;
      }
      const base64 = await context.takeScreenshot();
      if (!base64) {
        return;
      }
      const buffer = Buffer.from(base64, "base64");
      if (!buffer.length) {
        return;
      }
      if (this.shouldSkipDuplicate(buffer, state)) {
        return;
      }

      const relativePath = path.join(VISUAL_TRACE_DIR, this.buildFileName(context));
      const filePath = context.testInfo.outputPath(relativePath);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, buffer);
      await context.testInfo.attach(context.stepTitle, {
        path: filePath,
        contentType: "image/png",
      });
      state.count += 1;
      if (this.dedupeEnabled()) {
        state.hashes.add(hashBuffer(buffer));
      }
    } catch (error) {
      logger.error("VisualTraceService.captureActionEnd failed:", error);
    }
  }

  private buildFileName(context: VisualCaptureContext): string {
    const slug = sanitizeForFile(`${context.methodName}-${context.stepTitle}`);
    return `${Date.now()}-${randomUUID()}-${slug}.png`;
  }

  private ensureState(testId: string): CaptureState {
    if (!this.stateByTestId.has(testId)) {
      this.stateByTestId.set(testId, { count: 0, hashes: new Set() });
    }
    return this.stateByTestId.get(testId)!;
  }

  private canCapture(state: CaptureState): boolean {
    const limit = this.config?.maxScreenshotsPerTest;
    if (typeof limit === "number" && limit >= 0) {
      return state.count < limit;
    }
    return true;
  }

  private shouldSkipDuplicate(buffer: Buffer, state: CaptureState): boolean {
    if (!this.dedupeEnabled()) {
      return false;
    }
    const hash = hashBuffer(buffer);
    if (state.hashes.has(hash)) {
      return true;
    }
    return false;
  }

  private dedupeEnabled(): boolean {
    return this.config?.dedupe !== false;
  }

  private isEnabled(context: VisualCaptureContext): boolean {
    if (typeof this.config?.enableScreenshots === "boolean") {
      return this.config.enableScreenshots;
    }
    return isTraceEnabledForAttempt(
      context.testInfo.project.use.trace,
      context.testInfo.retry ?? 0,
    );
  }
}

function sanitizeForFile(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const slug = trimmed.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "step";
}

function hashBuffer(buffer: Buffer): string {
  return createHash("sha1").update(buffer).digest("hex");
}

function isTraceEnabledForAttempt(
  traceSetting: VisualTraceTraceSetting | undefined,
  retry: number,
): boolean {
  if (!traceSetting) {
    return false;
  }
  if (
    typeof traceSetting === "object" &&
    traceSetting.screenshots === false
  ) {
    return false;
  }
  const mode =
    typeof traceSetting === "string"
      ? traceSetting
      : traceSetting.mode ?? "on";
  const normalizedMode: TraceMode =
    mode === "retry-with-trace" ? "on-first-retry" : mode;
  switch (normalizedMode) {
    case "off":
      return false;
    case "on":
    case "retain-on-failure":
      return true;
    case "retain-on-first-failure":
      return retry === 0;
    case "on-first-retry":
      return retry === 1;
    case "on-all-retries":
      return retry > 0;
    default:
      return false;
  }
}

type VisualTraceTraceSetting =
  | TraceMode
  | "retry-with-trace"
  | {
      mode?: TraceMode | "retry-with-trace";
      screenshots?: boolean;
      snapshots?: boolean;
      sources?: boolean;
      attachments?: boolean;
    };
