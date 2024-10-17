import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { getProviderClass } from "./providers";
import fs from "fs";

class VideoDownloader implements Reporter {
  private downloadPromises: Promise<any>[] = [];

  onBegin() {}

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
      const { workerIndex } = result;
      const expectedVideoPath = `${outputDir}/videos-store/worker-${workerIndex}-video.mp4`;
      const waitForWorkerToFinish = new Promise((resolve) => {
        const interval = setInterval(() => {
          console.log(`Checking if video exists at: ${expectedVideoPath}`);
          if (fs.existsSync(expectedVideoPath)) {
            result.attachments.push({
              path: expectedVideoPath,
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

export default VideoDownloader;
