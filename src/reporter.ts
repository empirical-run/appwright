import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { getProviderClass } from "./providers";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { logger } from "./logger";
import { basePath } from "./utils";
import { WorkerInfo, WorkerInfoStore } from "./fixture/workerInfo";

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
    // Check if test ran on `device` or on `persistentDevice`
    const isTestUsingDevice = sessionIdAnnotation && providerNameAnnotation;
    if (isTestUsingDevice) {
      // This is a test that ran with the `device` fixture
      const sessionId = sessionIdAnnotation.description;
      const providerName = providerNameAnnotation.description;
      const provider = getProviderClass(providerName!);
      this.downloadAndAttachDeviceVideo(test, result, provider, sessionId!);
      const otherAnnotations = test.annotations.filter(
        ({ type }) => type !== "sessionId" && type !== "providerName",
      );
      test.annotations = otherAnnotations;
    } else {
      // This is a test that ran on `persistentDevice` fixture
      const { workerIndex, duration } = result;
      if (duration <= 0) {
        // Skipped tests
        return;
      }
      test.annotations.push({
        type: "workerInfo",
        description: `Ran on worker #${workerIndex}.`,
      });
      const expectedVideoPath = path.join(
        basePath(),
        `worker-${workerIndex}-video.mp4`,
      );
      const workerDownload = waitFiveSeconds()
        .then(() => getWorkerInfo(workerIndex))
        .then(async (workerInfo) => {
          if (!workerInfo) {
            throw new Error(`Worker info not found for idx: ${workerIndex}`);
          }
          const { providerName, sessionId, endTime } = workerInfo;
          if (!providerName || !sessionId) {
            throw new Error(
              `Provider name or session id not found for worker: ${workerIndex}`,
            );
          }
          if (!this.providerSupportsVideo(providerName)) {
            return; // Nothing to do here
          }
          if (!endTime) {
            // This is an intermediate test in the worker, so let's wait for the
            return new Promise((resolve) => {
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
                  void this.trimAndAttachPersistentDeviceVideo(
                    test,
                    result,
                    expectedVideoPath,
                  ).then((trimmedPath) => {
                    resolve(trimmedPath);
                  });
                }
              }, 500);
            });
          } else {
            // This is the last test in the worker, so let's download the video
            const provider = getProviderClass(providerName);
            return new Promise((resolve) => {
              provider
                .downloadVideo(
                  sessionId,
                  basePath(),
                  `worker-${workerIndex}-video`,
                )
                .then(
                  (
                    downloadedVideo: {
                      path: string;
                      contentType: string;
                    } | null,
                  ) => {
                    if (!downloadedVideo) {
                      resolve(null);
                      return;
                    }
                    void this.trimAndAttachPersistentDeviceVideo(
                      test,
                      result,
                      downloadedVideo.path,
                    ).then((trimmedPath) => {
                      resolve(trimmedPath);
                    });
                  },
                );
              resolve(null);
            });
          }
        })
        .catch((e) => {
          logger.error("Failed to get worker end time:", e);
        });
      this.downloadPromises.push(workerDownload);
    }
  }

  async onEnd() {
    logger.log(`Triggered onEnd`);
    await Promise.allSettled(this.downloadPromises);
  }

  private async trimAndAttachPersistentDeviceVideo(
    test: TestCase,
    result: TestResult,
    workerVideoPath: string,
  ) {
    const workerIdx = result.workerIndex;
    const workerStart = await getWorkerStartTime(workerIdx);
    let pathToAttach = workerVideoPath;
    const testStart = result.startTime;
    if (testStart.getTime() < workerStart.getTime()) {
      // This is the first test for the worker
      // The startTime for the first test in the worker tends to be
      // before worker (session) start time. This would have been manageable
      // if the `duration` included the worker setup time, but the duration only
      // covers the test method execution time.
      // So in this case, we are not going to trim.
      // TODO: We can use the startTime of the second test in the worker
      pathToAttach = workerVideoPath;
    } else {
      const trimSkipPoint =
        (testStart.getTime() - workerStart.getTime()) / 1000;
      const trimmedFileName = `worker-${workerIdx}-trimmed-${test.id}.mp4`;
      try {
        pathToAttach = await trimVideo({
          originalVideoPath: workerVideoPath,
          startSecs: trimSkipPoint,
          durationSecs: result.duration / 1000,
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
  }

  private downloadAndAttachDeviceVideo(
    test: TestCase,
    result: TestResult,
    providerClass: any,
    sessionId: string,
  ) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const videoFileName = `${test.id}-${random}`;
    if (!providerClass.downloadVideo) {
      return;
    }
    const downloadPromise = new Promise((resolve) => {
      providerClass
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
  }

  private providerSupportsVideo(providerName: string) {
    const provider = getProviderClass(providerName);
    return !!provider.downloadVideo;
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

async function getWorkerStartTime(idx: number): Promise<Date> {
  const workerInfoStore = new WorkerInfoStore();
  return workerInfoStore.getWorkerStartTime(idx);
}

async function getWorkerInfo(idx: number): Promise<WorkerInfo | undefined> {
  const workerInfoStore = new WorkerInfoStore();
  return workerInfoStore.getWorkerFromDisk(idx);
}

const waitFiveSeconds = () =>
  new Promise((resolve) => setTimeout(resolve, 5000));

export default VideoDownloader;
