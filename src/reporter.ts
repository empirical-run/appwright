import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { getProviderClass } from "./providers";

class VideoDownloader implements Reporter {
  private downloadPromises: Promise<any>[] = [];

  onBegin() {}

  onTestBegin() {}

  onTestEnd(test: TestCase, result: TestResult) {
    const sessionIdAnnotation = test.annotations.find(
      ({ type }) => type === "sessionId",
    );
    const providerNameAnnotation = test.annotations.find(
      ({ type }) => type === "providerName",
    );
    if (sessionIdAnnotation && providerNameAnnotation) {
      const sessionId = sessionIdAnnotation.description;
      const providerName = providerNameAnnotation.description!;
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
    }
  }

  async onEnd() {
    await Promise.all(this.downloadPromises);
  }
}

export default VideoDownloader;
