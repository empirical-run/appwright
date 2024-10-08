import fs from "fs";
import FormData from "form-data";

export function getAuthHeader() {
  const userName = process.env.LAMBDATEST_USERNAME;
  const accessKey = process.env.LAMBDATEST_ACCESS_KEY;
  const key = Buffer.from(`${userName}:${accessKey}`).toString("base64");
  return `Basic ${key}`;
}

interface MediaUploadResponse {
  media_url: string;
}

export async function uploadImageToLambdaTest(
  imagePath: string,
): Promise<string> {
  const formData = new FormData();
  if (!fs.existsSync(imagePath)) {
    throw new Error(
      `No image file found at the specified path: ${imagePath}. Please provide a valid image file. 
  Supported formats include JPG, JPEG, and PNG. Ensure the file exists and the path is correct.`,
    );
  }
  formData.append("media_file", fs.createReadStream(imagePath));
  formData.append("type", "image");
  formData.append("custom_id", "SampleMedia");
  const fetch = (await import("node-fetch")).default;
  const response = await fetch(
    "https://mobile-mgm.lambdatest.com/mfs/v1.0/media/upload",
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
      },
      body: formData,
    },
  );

  const data = (await response.json()) as MediaUploadResponse;
  console.log(data);
  const imageURL = data.media_url.trim();
  return imageURL;
}
