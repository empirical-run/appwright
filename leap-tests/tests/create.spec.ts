import { OnboardingPage } from "../pages/onboarding";
import { expect, test } from "../../src/index";

test("Create new wallet by entering the recovery phrase", async ({
  client,
}) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.createWalletWithCorrectRecoveryPhrase();
  await expect(
    client.locator(onboardingPage.dashboardTextSelector),
  ).toBeVisible();
});

test("Create new wallet by entering invalid word throws an error", async ({
  client,
}) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.createWalletWithIncorrectRecoveryPhrase();
  await expect(
    client.locator(onboardingPage.invalidPhraseSelector),
  ).toBeVisible();
});
