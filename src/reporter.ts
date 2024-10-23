import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { getProviderClass } from "./providers";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { logger } from "./logger";
import { basePath } from "./utils";
import { WorkerInfoStore } from "./fixture/workerInfo";

class VideoDownloader implements Reporter {
  private downloadPromises: Promise<any>[] = [];

  onBegin() {
    if (fs.existsSync(basePath())) {
      fs.rmSync(basePath(), {
        recursive: true,
      });
    }
  }

  onTestBegin(test: TestCase, result: TestResult) {
    logger.log(`Starting test: ${test.title} on worker ${result.workerIndex}`);
    const workerInfoStore = new WorkerInfoStore();
    void workerInfoStore.saveTestStartTime(
      result.workerIndex,
      test.title,
      new Date(),
    );
  }

  onTestEnd(test: TestCase, result: TestResult) {
    logger.log(`Ending test: ${test.title} on worker ${result.workerIndex}`);
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
          .downloadVideo(sessionId, basePath(), videoFileName)
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
      test.annotations.push({
        type: "workerInfo",
        description: `Ran on worker #${workerIndex}.`,
      });
      if (duration <= 0) {
        // Skipped tests
        return;
      }
      const expectedVideoPath = path.join(
        basePath(),
        `worker-${workerIndex}-video.mp4`,
      );
      const waitForWorkerToFinish = new Promise((resolve) => {
        let maxIntervalTime = 60 * 60 * 1000; // 1 hour in ms
        const interval = setInterval(async () => {
          maxIntervalTime -= 500;
          if (maxIntervalTime <= 0) {
            clearInterval(interval);
            logger.error("Timed out waiting for worker to finish");
            resolve(null);
          }
          if (fs.existsSync(expectedVideoPath)) {
            clearInterval(interval);
            const trimmedFileName = `worker-${workerIndex}-trimmed-${test.id}.mp4`;
            const workerStart = await workerStartTime(workerIndex);
            let pathToAttach = expectedVideoPath;
            let testStartTime: Date | undefined = startTime;
            if (startTime.getTime() < workerStart.getTime()) {
              // This is the first test running in the worker
              //
              // The startTime for the first test in the worker tends to be
              // before worker (session) start time, because worker start time is counted
              // after the Appium server session is created. This would have been manageable
              // if the `duration` included the worker setup time, but the duration only
              // covers the test method execution time.
              //
              // In this case, we use the start time of the second test to
              // trim the video. This is not perfect, but it's better than attaching
              // the full video.
              testStartTime = await getSecondTestStartTime(workerIndex);
            }
            if (testStartTime) {
              const trimSkipPoint =
                (testStartTime.getTime() - workerStart.getTime()) / 1000;
              try {
                pathToAttach = await trimVideo({
                  originalVideoPath: expectedVideoPath,
                  startSecs: trimSkipPoint,
                  durationSecs: duration / 1000,
                  outputPath: trimmedFileName,
                });
              } catch (e) {
                logger.error("Failed to trim video:", e);
                test.annotations.push({
                  type: "videoError",
                  description: `Unable to trim video, attaching full video instead. Test starts at ${trimSkipPoint} secs.`,
                });
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
    logger.log(`Triggered onEnd`);
    await Promise.allSettled(this.downloadPromises);
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
  logger.log(
    `Attemping to trim video: ${originalVideoPath} at start: ${startSecs} and duration: ${durationSecs} to ${outputPath}`,
  );
  const copyName = `draft-for-${outputPath}`;
  const dirPath = path.dirname(originalVideoPath);
  const copyFullPath = path.join(dirPath, copyName);
  const fullOutputPath = path.join(dirPath, outputPath);
  fs.copyFileSync(originalVideoPath, copyFullPath);
  return new Promise((resolve, reject) => {
    let stdErrs = "";
    ffmpeg(copyFullPath)
      .setFfmpegPath(ffmpegInstaller.path)
      .setStartTime(startSecs)
      .setDuration(durationSecs)
      .output(fullOutputPath)
      .on("end", () => {
        logger.log(`Trimmed video saved at: ${fullOutputPath}`);
        fs.unlinkSync(copyFullPath);
        resolve(fullOutputPath);
      })
      .on("stderr", (stderrLine) => {
        stdErrs += stderrLine + "\n";
      })
      .on("error", (err) => {
        logger.error("ffmpeg error:", err);
        logger.error("ffmpeg stderr:", stdErrs);
        reject(err);
      })
      .run();
  });
}

async function workerStartTime(idx: number): Promise<Date> {
  const workerInfoStore = new WorkerInfoStore();
  return workerInfoStore.getWorkerStartTime(idx);
}

async function getSecondTestStartTime(idx: number): Promise<Date | undefined> {
  const workerInfoStore = new WorkerInfoStore();
  return workerInfoStore.getTestStartTime(idx, 1);
}

export default VideoDownloader;
