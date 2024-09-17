import { OnboardingPage } from "../pages/onboarding";
import { expect, test } from "../../src/index";
import { ELEMENT_TIMEOUT } from "../pages/constants";

test("Create new wallet by entering the recovery phrase", async ({
  client,
}) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await client.getByText("Create a new wallet", { exact: true }).click();
  await onboardingPage.enterPhrase();
  await expect(client.getByText("YOUR PORTFOLIO")).toBeVisible({
    timeout: ELEMENT_TIMEOUT,
  });
});

test("Create new wallet by entering invalid word throws an error", async ({
  client,
}) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await client.getByText("Create a new wallet", { exact: true }).click();
  await client
    .getByText("Yes, I have saved it somewhere safe", { exact: true })
    .click();

  await client.getById("inputAt4").fill("wrong");
  await client.getById("inputAt7").fill("recovery");
  await client.getById("inputAt11").fill("phrase");
  if (!client.isAndroid()) {
    await client.getByText("return").click();
  }
  await client.getByText("Confirm", { exact: true }).click();
  await expect(
    client.getByText("Enter correct 4th, 7th, 11th word"),
  ).toBeVisible({ timeout: ELEMENT_TIMEOUT });
});
