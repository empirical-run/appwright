import { test, expect } from "appwright";

test("Navigate to wikipedia dashboard, search for playwright and verify `Microsoft` is visible", async ({
  device,
}) => {
  await device.getByText("Skip").tap();
  await device.getByText("Search Wikipedia").tap();
  await device
    .getByText("Search Wikipedia", {exact: true})
    .fill("playwright");
  await device.getByText("Playwright (software)").tap();
  await expect(device.getByText("Microsoft")).toBeVisible();
});
