import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { getProviderClass } from "./providers";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

class VideoDownloader implements Reporter {
  private downloadPromises: Promise<any>[] = [];
  private workerStartTimes: Record<number, Date> = {};

  onBegin() {}

  onTestBegin(_: TestCase, result: TestResult) {
    const { workerIndex } = result;
    if (!this.workerStartTimes[workerIndex]) {
      this.workerStartTimes[workerIndex] = new Date();
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const sessionIdAnnotation = test.annotations.find(
      ({ type }) => type === "sessionId",
    )!;
    const providerNameAnnotation = test.annotations.find(
      ({ type }) => type === "providerName",
    )!;
    const outputDir = `${process.cwd()}/playwright-report`;
    if (sessionIdAnnotation && providerNameAnnotation) {
      // This is a test that ran with the `device` fixture
      const sessionId = sessionIdAnnotation.description;
      const providerName = providerNameAnnotation.description;
      const provider = getProviderClass(providerName!);
      const random = Math.floor(1000 + Math.random() * 9000);
      const videoFileName = `${test.id}-${random}`;
      const downloadPromise = new Promise((resolve) => {
        provider
          .downloadVideo(sessionId, outputDir, videoFileName)
          .then(
            (downloadedVideo: { path: string; contentType: string } | null) => {
              if (!downloadedVideo) {
                console.log(`No video found for test: ${test.title}`);
                resolve(null);
                return;
              }
              console.log(`Downloaded video:`, downloadedVideo);
              result.attachments.push({
                ...downloadedVideo,
                name: "video",
              });
              resolve(downloadedVideo);
            },
          );
      });
      this.downloadPromises.push(downloadPromise);
    } else {
      // This is a test that ran on `persistentDevice` fixture
      const { workerIndex, startTime, duration } = result;
      const expectedVideoPath = `${outputDir}/videos-store/worker-${workerIndex}-video.mp4`;
      const waitForWorkerToFinish = new Promise((resolve) => {
        const interval = setInterval(async () => {
          console.log(`Checking if video exists at: ${expectedVideoPath}`);
          if (fs.existsSync(expectedVideoPath)) {
            console.log(`Trimming video at: ${expectedVideoPath}`);
            const trimmedVideoPath = `${expectedVideoPath}-trimmed.mp4`;
            const trimSkipPoint =
              (startTime.getTime() -
                this.workerStartTimes[workerIndex]!.getTime()) /
              1000;
            const pathToAttach = await trimVideo({
              originalVideoPath: expectedVideoPath,
              startSecs: trimSkipPoint,
              durationSecs: duration / 1000,
              outputPath: trimmedVideoPath,
            });
            result.attachments.push({
              path: pathToAttach,
              contentType: "video/mp4",
              name: "video",
            });

            clearInterval(interval);
            resolve(expectedVideoPath);
          }
        }, 500);
      });
      this.downloadPromises.push(waitForWorkerToFinish);
    }
  }

  async onEnd(result: FullResult) {
    console.log(`Finished the run: ${result.status}`);
    console.log(`Downloading videos at: ${new Date().toISOString()}`);
    await Promise.all(this.downloadPromises);
    console.log(`Finished downloading at: ${new Date().toISOString()}`);
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
  return new Promise((resolve) => {
    ffmpeg(originalVideoPath)
      .setStartTime(startSecs)
      .setDuration(durationSecs)
      .output(outputPath)
      .on("end", () => {
        console.log(`Trimmed video saved at: ${outputPath}`);
        resolve(outputPath);
      })
      .run();
  });
}

export default VideoDownloader;
