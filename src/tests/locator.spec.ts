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

test("isVisible on element that is found but fails displayed check", async () => {
  const mockFindElements = vi.fn().mockResolvedValue([
    {
      "element-6066-11e4-a52e-4f735466cecf": "element-id",
    },
  ]);
  const mockIsElementDisplayed = vi.fn().mockResolvedValue(false);
  //@ts-ignore
  const wdClientMock: WebDriverClient = {
    findElements: mockFindElements,
    isElementDisplayed: mockIsElementDisplayed,
  };
  const locator = new Locator(
    wdClientMock,
    { expectTimeout: 1_000 },
    "//known-but-hidden-element",
    "xpath",
  );
  const isVisible = await locator.isVisible();
  expect(isVisible).toBe(false);
  expect(mockFindElements).toHaveBeenCalledTimes(2);
  expect(mockIsElementDisplayed).toHaveBeenCalledTimes(2);
  expect(mockIsElementDisplayed).toHaveBeenCalledWith("element-id");
});

test("isVisible on element that throws stale element reference", async () => {
  const mockFindElements = vi.fn().mockResolvedValue([
    {
      "element-6066-11e4-a52e-4f735466cecf": "element-id",
    },
  ]);
  const mockIsElementDisplayed = vi.fn().mockImplementation(() => {
    class WebDriverInteralError extends Error {
      constructor(name: string, ...args: any[]) {
        super(...args);
        this.name = name;
      }
    }
    throw new WebDriverInteralError(`random stale element reference random`);
  });
  //@ts-ignore
  const wdClientMock: WebDriverClient = {
    findElements: mockFindElements,
    isElementDisplayed: mockIsElementDisplayed,
  };
  const locator = new Locator(
    wdClientMock,
    { expectTimeout: 1_000 },
    "//known-element-that-keeps-throwing-stale-element-reference",
    "xpath",
  );
  const isVisible = await locator.isVisible();
  expect(isVisible).toBe(false);
  expect(mockFindElements).toHaveBeenCalledTimes(2);
  expect(mockIsElementDisplayed).toHaveBeenCalledTimes(2);
  expect(mockIsElementDisplayed).toHaveBeenCalledWith("element-id");
});
