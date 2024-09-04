import WebDriver, { Client } from "webdriver";
import { test, expect } from "./fixtures";

async function enterPinOnScreen(pin: string,client: Client): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    for (const digit of pin) {
        await test.step(`Clicking button ${digit}`,async () => {
            const xpath = `//android.widget.TextView[@text="${digit}"]`;
            const button = await client.findElement('xpath', xpath);
            await client.elementClick(button["element-6066-11e4-a52e-4f735466cecf"])
        });
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
}

test("ability to login with correct credentials", async ({ client, saveVideo }) => {
    await test.step("Choose your pin", async ()=> {
        await enterPinOnScreen("1234", client);
    });

    await test.step("Enter your pin", async ()=> {
        await enterPinOnScreen("1234", client);
    })
});