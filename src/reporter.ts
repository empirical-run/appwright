import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { getProviderClass } from "./providers";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { logger } from "./logger";
import { basePath, workerVideoPath } from "./utils";
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
      const expectedVideoPath = workerVideoPath(workerIndex);
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
            await getVideoStartOffset(workerIndex);
            const trimmedFileName = `worker-${workerIndex}-trimmed-${test.id}.mp4`;
            const videoStart = await workerVideoStartTime(workerIndex);
            let videoDuration: number | undefined = duration / 1000;
            if (startTime.getTime() < videoStart.getTime()) {
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
              videoDuration = await getSecondTestStartOffset(workerIndex);
              test.annotations.push({
                type: "videoInfo",
                description:
                  "This is the first test in worker, so video includes setup.",
              });
            }
            let pathToAttach = expectedVideoPath;
            if (startTime && videoDuration) {
              const trimSkipPoint =
                startTime.getTime() < videoStart.getTime()
                  ? 0
                  : (startTime.getTime() - videoStart.getTime()) / 1000;
              try {
                pathToAttach = await trimVideo({
                  originalVideoPath: expectedVideoPath,
                  startSecs: trimSkipPoint,
                  durationSecs: videoDuration + 10,
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

async function getVideoStartOffset(
  workerIdx: number,
): Promise<number | undefined> {
  // In the trimming logic, we assume that worker.afterAppiumSessionStarted
  // is the start time of the video. But this is not always true, because the
  // video recording can start before the session is said to be started
  // In particular, BrowserStack videos tend to show the app getting installed,
  // and this period is before the point where Appwright can say that the session
  // has started. LambdaTest tends to return a video only for the duration of the
  // actual session (you don't see app getting installed in that video).
  //
  // This time period (from the actual start of the video to the start of the
  // session as known by Appwright) can be about 20-40 secs, and this needs to be
  // added to the start point of the trimming logic.
  //
  // This method approximates this offset, by comparing the duration of the video
  // file to the duration of the session, with the assumption that the end of the video
  // and the end of the session will align.
  const workerVideo = workerVideoPath(workerIdx);
  console.log("path", workerVideo);
  console.log("fs.exist", fs.existsSync(workerVideo));
  const videoFileDuration = await getVideoDuration(workerVideoPath(workerIdx));
  // TODO: wrap this in try catch
  const workerInfoStore = new WorkerInfoStore();
  const workerEndTime = await workerInfoStore.getWorkerEndTime(workerIdx);
  const workerStartTime =
    await workerInfoStore.getWorkerVideoStartTime(workerIdx);
  if (workerEndTime && workerStartTime) {
    const workerDuration =
      (workerEndTime.getTime() - workerStartTime.getTime()) / 1000;
    console.log("workerDuration", workerDuration);
    console.log("videoFileDuration", videoFileDuration);
  }
  return 1;
}

async function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .setFfprobePath(ffmpegInstaller.path)
      .ffprobe((err, metadata) => {
        if (err) {
          return reject(err);
        }
        const duration = metadata.format.duration;
        if (!duration) {
          return reject(`ffprobe error: no duration for file`);
        }
        resolve(duration);
      });
  });
}

async function workerVideoStartTime(idx: number): Promise<Date> {
  const workerInfoStore = new WorkerInfoStore();
  return workerInfoStore.getWorkerVideoStartTime(idx);
}

async function getSecondTestStartOffset(
  idx: number,
): Promise<number | undefined> {
  const workerInfoStore = new WorkerInfoStore();
  return workerInfoStore.getTestStartOffset(idx, 1);
}

export default VideoDownloader;
