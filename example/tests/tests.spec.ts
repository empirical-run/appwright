import { test, expect } from "appwright";

test("Navigate to wikipedia dashboard, search for playwright and verfiy `Microsoft` is visible", async ({
  device,
}) => {
  await device.getByText("Skip", { exact: true }).tap();
  await device
    .getByText("Search Wikipedia", { exact: true })
    .fill("playwright");
  await device.getByText("Playwright (software)", { exact: true }).tap();
  await expect(device.getByText("Microsoft")).toBeVisible();
});
