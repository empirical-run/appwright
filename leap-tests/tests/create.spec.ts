import { OnboardingPage } from "../pages/onboarding";
import { expect, test } from "../../src/index";
import { ELEMENT_TIMEOUT } from "../pages/constants";

test("Create new wallet by entering the recovery phrase", async ({
  client,
}) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.createWalletWithCorrectRecoveryPhrase();
  await expect(
    client.locator(onboardingPage.dashboardTextSelector),
  ).toBeVisible({ timeout: ELEMENT_TIMEOUT });
});

test("Create new wallet by entering invalid word throws an error", async ({
  client,
}) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.createWalletWithIncorrectRecoveryPhrase();
  await expect(
    client.locator(onboardingPage.invalidPhraseSelector),
  ).toBeVisible({ timeout: ELEMENT_TIMEOUT });
});
