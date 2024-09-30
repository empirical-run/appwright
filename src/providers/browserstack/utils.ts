import fs from "fs";
import FormData from "form-data";
import { join } from "path";

async function readStreamToBuffer(stream: fs.ReadStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => {
      if (chunk instanceof Buffer) {
        chunks.push(chunk);
      }
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function getAuthHeader() {
  const userName = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  const key = Buffer.from(`${userName}:${accessKey}`).toString("base64");
  return `Basic ${key}`;
}

// Function to convert ReadStream to Blob
async function convertReadStreamToBlob(filePath: string): Promise<Blob> {
  const readStream = fs.createReadStream(filePath);

  // Convert ReadStream to Buffer
  const buffer = await readStreamToBuffer(readStream);

  // Convert Buffer to Blob
  const blob = new Blob([buffer]);

  return blob;
}

export async function readQRCode(): Promise<string> {
  const filePath = join(process.cwd(), "screenshot.png");
  const formData = new FormData();
  const blob = await convertReadStreamToBlob(filePath);
  formData.append("file", blob);
  formData.append("custom_id", "SampleMedia");
  const response = await fetch(
    `https://api-cloud.browserstack.com/app-automate/upload-media`,
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
      },
      body: formData as any,
    },
  );

  const data = await response.json();
  return data.media_url.trim();
}
