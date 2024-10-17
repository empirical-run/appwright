import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { getProviderClass } from "./providers";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

class VideoDownloader implements Reporter {
  private downloadPromises: Promise<any>[] = [];

  onBegin() {
    const videoStorePath = `${process.cwd()}/playwright-report/videos-store`;
    if (fs.existsSync(videoStorePath)) {
      fs.rmSync(videoStorePath, {
        recursive: true,
      });
    }
  }

  onTestBegin() {}

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
      if (duration <= 0) {
        // Skipped tests
        return;
      }
      const expectedVideoPath = `${outputDir}/videos-store/worker-${workerIndex}-video.mp4`;
      const waitForWorkerToFinish = new Promise((resolve) => {
        const interval = setInterval(async () => {
          if (fs.existsSync(expectedVideoPath)) {
            clearInterval(interval);
            console.log(`Trimming video at: ${expectedVideoPath}`);
            const trimmedFileName = `worker-${workerIndex}-trimmed-${test.id}.mp4`;
            const workerStart = workerStartTime(workerIndex);
            let pathToAttach = expectedVideoPath;
            if (startTime.getTime() > workerStart.getTime()) {
              // The startTime for the first test in the worker tends to be
              // before worker (session) start time. This would have been manageable
              // if the `duration` included the worker setup time, but it doesn't.
              // So in this case, we are not going to trim.
              const trimSkipPoint =
                (startTime.getTime() - workerStart.getTime()) / 1000;
              console.log(
                `skip point: ${trimSkipPoint} duration: ${duration / 1000} `,
              );
              pathToAttach = await trimVideo({
                originalVideoPath: expectedVideoPath,
                startSecs: trimSkipPoint,
                durationSecs: duration / 1000,
                outputPath: trimmedFileName,
              });
            }
            console.log(`attaching: ${pathToAttach}`);
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
  const basePath = `${process.cwd()}/playwright-report/videos-store`;
  const filePath = path.join(basePath, fileName);
  const content = fs.readFileSync(filePath, "utf-8");
  return new Date(content);
}

export default VideoDownloader;
