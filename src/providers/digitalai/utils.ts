export function getAuthHeader() {
  return `Bearer ${process.env.DIGITALAI_ACCESS_KEY}`;
}
