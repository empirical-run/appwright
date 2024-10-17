import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { getProviderClass } from "./providers";

class VideoDownloader implements Reporter {
  private downloadPromises: Promise<any>[] = [];

  onBegin() {}

  onTestBegin() {}

  onTestEnd(test: TestCase, result: TestResult) {
    console.log(test.annotations);
    const { description: sessionId } = test.annotations.find(
      ({ type }) => type === "sessionId",
    )!;
    const { description: providerName } = test.annotations.find(
      ({ type }) => type === "providerName",
    )!;
    if (sessionId && providerName) {
      const provider = getProviderClass(providerName);
      const random = Math.floor(1000 + Math.random() * 9000);
      const videoFileName = `${test.id}-${random}`;
      const outputDir = `${process.cwd()}/playwright-report`;
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
    }
  }

  async onEnd(result: FullResult) {
    console.log(`Finished the run: ${result.status} `);
    await Promise.all(this.downloadPromises);
  }
}

export default VideoDownloader;
