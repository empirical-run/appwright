export function getAuthHeader() {
  const userName = process.env.KOBITON_USERNAME;
  const apiKey = process.env.KOBITON_API_KEY;
  const key = Buffer.from(`${userName}:${apiKey}`).toString("base64");
  return `Basic ${key}`;
}
