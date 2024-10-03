import { test, expect } from "appwright";

test("Open Playwright on Wikipedia and verify Microsoft is visible", async ({
  device,
}) => {
  // Dismiss splash screen
  await device.getByText("Skip").tap();

  // Enter search term
  const searchInput = device.getByText("Search Wikipedia", { exact: true });
  await searchInput.tap();
  await searchInput.fill("playwright");

  // Open search result and assert
  await device.getByText("Playwright (software)").tap();
  await expect(device.getByText("Microsoft")).toBeVisible();
});
