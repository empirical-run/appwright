import { test as base } from "@playwright/test";
import WebDriver, { Client } from "webdriver";
import { config } from "../bs-config/webdriver_config";
import { downloadVideo, getSessionDetails } from "../bs-config/bs_utils";
import path from "path";
import { OnboardingPage } from "../leap-tests/pages/onboarding";

var sessionId: string;
const videoStore = "videos-store";
export const test = base.extend<{
  client: any;
  saveVideo: void;
  pinFixture: { driver: Client; onboardingPage: OnboardingPage };
}>({
  client: async ({}, use) => {
    // Start the WebDriver session
    const driver = await WebDriver.newSession(config as any);
    sessionId = driver.sessionId;
    console.log(`SessionId: ${sessionId}`);

    // Use the driver for the test
    await use(driver);

    // Ensure the session is closed after the test
    await driver.deleteSession();
  },

  saveVideo: [
    async ({}, use, testInfo) => {
      await use();

      // Now execute saveVideo after the session has been closed
      console.log(`*****SessionID: ${sessionId} TestID: ${testInfo.testId}`);
      // Get the session details after the session is closed
      var data = await getSessionDetails(sessionId);
      const videoURL = data.video_url;

      // Construct the path to save the video
      const pathToTestVideo = path.join(
        testInfo.project.outputDir,
        videoStore,
        `${testInfo.testId}.mp4`,
      );

      // Download the video
      await downloadVideo(videoURL, pathToTestVideo);
      console.log(`Video saved to: ${pathToTestVideo}`);

      // Attach the video to the test report
      await testInfo.attach("video", {
        path: pathToTestVideo,
        contentType: "video/mp4",
      });
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
