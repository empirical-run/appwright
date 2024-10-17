import { vi, test, expect } from "vitest";
//@ts-ignore
import { Client as WebDriverClient } from "webdriver";
import { Locator } from "../locator";

test("isVisible on unknown element", async () => {
  const mockFindElements = vi.fn().mockResolvedValue([]);
  //@ts-ignore
  const wdClientMock: WebDriverClient = {
    findElements: mockFindElements,
  };
  const locator = new Locator(
    wdClientMock,
    { expectTimeout: 1_000 },
    "//unknown-selector",
    "xpath",
  );
  const isVisible = await locator.isVisible();
  expect(isVisible).toBe(false);
  expect(mockFindElements).toHaveBeenCalledTimes(2);
});
