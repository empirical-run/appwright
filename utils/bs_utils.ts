import fs from 'fs';
import path from 'path';
import retry from 'async-retry';

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
      }
    );
  
    if (!response.ok) {
      throw new Error(`Error fetching session details: ${response.statusText}`);
    }
  
    const data = await response.json();
    return data.automation_session;
}

  export async function downloadVideo(url: string, filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    await new Promise((resolve) => setTimeout(resolve, 20_000));
    const fileStream = fs.createWriteStream(filePath);

    await retry(
        async (bail) => {
            const response = await fetch(url, {
                method: 'GET',
            });
            
            console.log(`Response: ${response.status}`);
            if (response.status === 404) {
                // Retry on 404
                throw new Error(`Video not found: 404 (URL: ${url})`);
            }

            if (response.status !== 200) {
                // Bail out for non-404 and non-200 statuses
                bail(new Error(`Failed to download video: Status Code ${response.status}`));
                return;
            }

            console.log("1. Reader...");
            const reader = response.body?.getReader();

            if (!reader) {
                throw new Error('Failed to get reader from response body.');
            }

            // Simple loop to read and write data chunks
            const streamToFile = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    fileStream.write(value);
                }
            };

            console.log("2. Streaming...");
            await streamToFile();
            fileStream.close();
            console.log('Video downloaded successfully!');
        },
        {
            retries: 10, // Retry up to 5 times only for 404
            factor: 1, // No exponential backoff (retry after constant time)
            minTimeout: 50000, // Minimum wait time between retries
            onRetry: (err, i) => {
                console.log(`Retry attempt ${i} failed: ${err.message}`);
            },
        }
    );

    // Ensure file stream is closed even in case of an error
    fileStream.on('finish', () => {
        console.log(`Download finished and file closed: ${filePath}`);
    });

    fileStream.on('error', (err) => {
        console.error(`Failed to write file: ${err.message}`);
    });
}