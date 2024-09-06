import { Client } from "webdriver";
import { WaitUntilOptions } from "../types/types";
import Timer from "./timer";

export async function click({
  client,
  xpath,
}: {
  client: Client;
  xpath: string;
}) {
  const button = await client.findElement("xpath", xpath);
  await client.elementClick(button["element-6066-11e4-a52e-4f735466cecf"]);
}
export async function waitAndClick(
  client: Client,
  xpath: string,
  timeout = 5000,
  interval = 500,
) {
  try {
    await waitUntil(
      client,
      async () => {
        const element = await client.findElement("xpath", xpath);
        return await client.isElementDisplayed(
          element["element-6066-11e4-a52e-4f735466cecf"],
        );
      },
      {
        timeout: timeout,
        interval: interval,
        timeoutMsg: `Element with XPath "${xpath}" not visible within ${timeout}ms`,
      },
    );

    const button = await client.findElement("xpath", xpath);
    await client.elementClick(button["element-6066-11e4-a52e-4f735466cecf"]);
  } catch (error) {
    throw new Error(
      `Failed to click on the element with XPath "${xpath}": ${error.message}`,
    );
  }
}

export async function isElementVisibleWithinTimeout(
  client: Client,
  xpath: string,
  {
    timeout = 5000,
    interval = 500,
    timeoutMsg = `Element with XPath "${xpath}" not visible within ${timeout}ms`,
  },
): Promise<boolean> {
  try {
    const isVisible = await waitUntil(
      client,
      async () => {
        try {
          const element = await client.findElement("xpath", xpath);

          if (element && element["element-6066-11e4-a52e-4f735466cecf"]) {
            const isDisplayed = await client.isElementDisplayed(
              element["element-6066-11e4-a52e-4f735466cecf"],
            );
            return isDisplayed;
          } else {
            return false;
          }
        } catch (error) {
          console.log(
            `Error while checking visibility of element with XPath "${xpath}": ${error.message}`,
          );
          return false;
        }
      },
      {
        timeout,
        interval,
        timeoutMsg,
      },
    );

    return isVisible;
  } catch (error) {
    console.log(
      `Error or timeout occurred while waiting for element: ${error.message}`,
    );
    return false;
  }
}

async function waitUntil<ReturnValue>(
  client: Client,
  condition: () => ReturnValue | Promise<ReturnValue>,
  {
    timeout = 5000,
    interval = 500,
    timeoutMsg,
  }: Partial<WaitUntilOptions> = {},
): Promise<Exclude<ReturnValue, boolean>> {
  if (typeof condition !== "function") {
    throw new Error("Condition is not a function");
  }

  if (typeof timeout !== "number" || isNaN(timeout)) {
    timeout = 5000;
  }

  if (typeof interval !== "number" || isNaN(interval)) {
    interval = 500;
  }

  const fn = condition.bind(client);
  const timer = new Timer(interval, timeout, fn, true);

  return (timer as any).catch((e: Error) => {
    if (e.message === "timeout") {
      if (typeof timeoutMsg === "string") {
        throw new Error(timeoutMsg);
      }
      throw new Error(`waitUntil condition timed out after ${timeout}ms`);
    }

    throw new Error(
      `waitUntil condition failed with the following reason: ${(e && e.message) || e}`,
    );
  });
}

export async function fill(client: Client, xpath: string, value: string) {
  const isElementDisplayed = await isElementVisibleWithinTimeout(
    client,
    xpath,
    {},
  );
  if (isElementDisplayed) {
    const element = await client.findElement("xpath", xpath);
    await client.elementSendKeys(
      element["element-6066-11e4-a52e-4f735466cecf"],
      value,
    );
  } else {
    throw new Error(`Element with XPath "${xpath}" not visible`);
  }
}
