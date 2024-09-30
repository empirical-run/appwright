import fs from "fs";
import FormData from "form-data";

function getAuthHeader() {
  const userName = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  const key = Buffer.from(`${userName}:${accessKey}`).toString("base64");
  return `Basic ${key}`;
}

interface MediaUploadResponse {
  media_url: string;
  custom_id: string;
  shareable_id: string;
}

export async function readQRCode(qrImagePath: string): Promise<string> {
  const formData = new FormData();
  if (!fs.existsSync(qrImagePath)) {
    throw new Error(
      `No image file found at the specified path: ${qrImagePath}. Please provide a valid image file. 
Supported formats include JPG, JPEG, and PNG. Ensure the file exists and the path is correct.`,
    );
  }
  formData.append("file", fs.createReadStream(qrImagePath));
  formData.append("custom_id", "SampleMedia");
  const fetch = (await import("node-fetch")).default;
  const response = await fetch(
    "https://api-cloud.browserstack.com/app-automate/upload-media",
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
      },
      body: formData,
    },
  );

  const data = (await response.json()) as MediaUploadResponse;
  const imageURL = data.media_url.trim();
  return imageURL;
}
