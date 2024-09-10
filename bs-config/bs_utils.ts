import fs from "fs";
import path from "path";
import retry from "async-retry";

const _sessionBaseURL =
  "https://api-cloud.browserstack.com/app-automate/sessions";

export async function getSessionDetails(sessionId: string): Promise<any> {
  const userName = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  const response = await fetch(`${_sessionBaseURL}/${sessionId}.json`, {
    method: "GET",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${userName}:${accessKey}`).toString("base64"),
    },
  });

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
      factor: 2,
      minTimeout: 10_000,
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

export async function setSessionName(sessionId: string, data: any) {
  console.log(
    `*****Calling setSessionDetails with sessionId: ${sessionId} and data: ${data}`,
  );
  const userName = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

  const response = await fetch(`${_sessionBaseURL}/${sessionId}.json`, {
    method: "PUT",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${userName}:${accessKey}`).toString("base64"),
      "Content-Type": "application/json", // Set the content type to JSON
    },
    body: JSON.stringify({ name: `${data}` }), // Set the request body
  });

  if (!response.ok) {
    throw new Error(`Error setting session details: ${response.statusText}`);
  }

  // Parse and print the response
  const responseData = await response.json();
  return responseData;
}

export async function setSessionStatus(
  sessionId: string,
  status?: string,
  reason?: string,
) {
  console.log(
    `*****Calling setSessionDetails with sessionId: ${sessionId} and status: ${status} and reason: ${reason}`,
  );
  const userName = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

  const response = await fetch(`${_sessionBaseURL}/${sessionId}.json`, {
    method: "PUT",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${userName}:${accessKey}`).toString("base64"),
      "Content-Type": "application/json", // Set the content type to JSON
    },
    body: JSON.stringify({
      status: status,
      reason: reason,
    }), // Set the request body
  });

  if (!response.ok) {
    throw new Error(`Error setting session details: ${response.statusText}`);
  }

  // Parse and print the response
  const responseData = await response.json();
  console.log("Response from setting session details:", responseData);

  return responseData;
}

export async function updateBuildNumber(config: any) {
  const env = process.env;
  const newBuildNumber =
    env.GITHUB_ACTIONS === "true" ? `CI ${env.GITHUB_RUN_ID}` : env.USER;

  if (newBuildNumber) {
    if (config.capabilities && config.capabilities["bstack:options"]) {
      config.capabilities["bstack:options"].buildIdentifier = newBuildNumber;
    }
  }
  return config;
}
