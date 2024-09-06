import fs from "fs";
import path from "path";
import retry from "async-retry";

export async function getSessionDetails(sessionId: string): Promise<any> {
  const userName = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  const response = await fetch(
    `https://api-cloud.browserstack.com/app-automate/sessions/${sessionId}.json`,
    {
      method: "GET",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${userName}:${accessKey}`).toString("base64"),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Error fetching session details: ${response.statusText}`);
  }

  const data = await response.json();
  return data.automation_session;
}

export async function downloadVideo(
  url: string,
  filePath: string,
): Promise<void> {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`URL is: ${url}`);
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  const fileStream = fs.createWriteStream(filePath);
  await retry(
    async () => {
      const response = await fetch(url, {
        method: "GET",
      });

      console.log(`Response: ${response.status}`);
      if (response.status !== 200) {
        // Retry if not 200
        throw new Error(`Video not found: ${response.status} (URL: ${url})`);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("Failed to get reader from response body.");
      }

      const streamToFile = async () => {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fileStream.write(value);
        }
      };

      await streamToFile();
      fileStream.close();
    },
    {
      retries: 10,
      factor: 1,
      minTimeout: 3_000,
      onRetry: (err, i) => {
        console.log(`Retry attempt ${i} failed: ${err.message}`);
      },
    },
  );

  // Ensure file stream is closed even in case of an error
  fileStream.on("finish", () => {
    console.log(`Download finished and file closed: ${filePath}`);
  });

  fileStream.on("error", (err) => {
    console.error(`Failed to write file: ${err.message}`);
  });
}
