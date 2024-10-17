import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { getProviderClass } from "./providers";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

const videoStoreBasePath = `${process.cwd()}/playwright-report/videos-store`;

class VideoDownloader implements Reporter {
  private downloadPromises: Promise<any>[] = [];

  onBegin() {
    if (fs.existsSync(videoStoreBasePath)) {
      fs.rmSync(videoStoreBasePath, {
        recursive: true,
      });
    }
  }

  onTestBegin() {}

  onTestEnd(test: TestCase, result: TestResult) {
    const sessionIdAnnotation = test.annotations.find(
      ({ type }) => type === "sessionId",
    );
    const providerNameAnnotation = test.annotations.find(
      ({ type }) => type === "providerName",
    );
    if (sessionIdAnnotation && providerNameAnnotation) {
      // This is a test that ran with the `device` fixture
      const sessionId = sessionIdAnnotation.description;
      const providerName = providerNameAnnotation.description;
      const provider = getProviderClass(providerName!);
      const random = Math.floor(1000 + Math.random() * 9000);
      const videoFileName = `${test.id}-${random}`;
      const downloadPromise = new Promise((resolve) => {
        provider
          .downloadVideo(sessionId, videoStoreBasePath, videoFileName)
          .then(
            (downloadedVideo: { path: string; contentType: string } | null) => {
              if (!downloadedVideo) {
                resolve(null);
                return;
              }
              result.attachments.push({
                ...downloadedVideo,
                name: "video",
              });
              resolve(downloadedVideo);
            },
          );
      });
      this.downloadPromises.push(downloadPromise);
      const otherAnnotations = test.annotations.filter(
        ({ type }) => type !== "sessionId" && type !== "providerName",
      );
      test.annotations = otherAnnotations;
    } else {
      // This is a test that ran on `persistentDevice` fixture
      const { workerIndex, startTime, duration } = result;
      if (duration <= 0) {
        // Skipped tests
        return;
      }
      const expectedVideoPath = `${videoStoreBasePath}/worker-${workerIndex}-video.mp4`;
      const waitForWorkerToFinish = new Promise((resolve) => {
        let maxIntervalTime = 60 * 60 * 1000; // 1 hour in ms
        const interval = setInterval(async () => {
          maxIntervalTime -= 500;
          if (maxIntervalTime <= 0) {
            clearInterval(interval);
            console.error("Timed out waiting for worker to finish");
            resolve(null);
          }
          if (fs.existsSync(expectedVideoPath)) {
            clearInterval(interval);
            const trimmedFileName = `worker-${workerIndex}-trimmed-${test.id}.mp4`;
            const workerStart = workerStartTime(workerIndex);
            let pathToAttach = expectedVideoPath;
            if (startTime.getTime() > workerStart.getTime()) {
              // The startTime for the first test in the worker tends to be
              // before worker (session) start time. This would have been manageable
              // if the `duration` included the worker setup time, but it doesn't.
              // So in this case, we are not going to trim.
              // TODO: We can use the startTime of the second test in the worker
              const trimSkipPoint =
                (startTime.getTime() - workerStart.getTime()) / 1000;
              try {
                pathToAttach = await trimVideo({
                  originalVideoPath: expectedVideoPath,
                  startSecs: trimSkipPoint,
                  durationSecs: duration / 1000,
                  outputPath: trimmedFileName,
                });
              } catch (e) {
                console.error("Failed to trim video:", e);
              }
            }
            result.attachments.push({
              path: pathToAttach,
              contentType: "video/mp4",
              name: "video",
            });
            resolve(expectedVideoPath);
          }
        }, 500);
      });
      this.downloadPromises.push(waitForWorkerToFinish);
    }
  }
  async onEnd() {
    await Promise.all(this.downloadPromises);
  }
}

function trimVideo({
  originalVideoPath,
  startSecs,
  durationSecs,
  outputPath,
}: {
  originalVideoPath: string;
  startSecs: number;
  durationSecs: number;
  outputPath: string;
}): Promise<string> {
  console.log(`Attemping to trim video: ${originalVideoPath}`);
  const copyName = `draft-for-${outputPath}`;
  const dirPath = path.dirname(originalVideoPath);
  const copyFullPath = path.join(dirPath, copyName);
  const fullOutputPath = path.join(dirPath, outputPath);
  fs.copyFileSync(originalVideoPath, copyFullPath);
  return new Promise((resolve) => {
    ffmpeg(copyFullPath)
      .setStartTime(startSecs)
      .setDuration(durationSecs)
      .output(fullOutputPath)
      .on("end", () => {
        console.log(`Trimmed video saved at: ${fullOutputPath}`);
        fs.unlinkSync(copyFullPath);
        resolve(fullOutputPath);
      })
      .run();
  });
}

function workerStartTime(idx: number): Date {
  const fileName = `worker-${idx}-start-time`;
  const filePath = path.join(videoStoreBasePath, fileName);
  const content = fs.readFileSync(filePath, "utf-8");
  return new Date(content);
}

export default VideoDownloader;
