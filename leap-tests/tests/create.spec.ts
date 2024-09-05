import { test, expect } from "../../utils/fixtures";
import { OnboardingPage } from "../pages/onboarding";

test("Create new wallet by entering the recovery phrase", async ({
  client,
}) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.createWalletWithCorrectRecoveryPhrase();
  expect(await onboardingPage.isDashboardVisible()).toBe(true);
});

test("Create new wallet by entering invalid word throws an error", async ({
  client,
}) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.createWalletWithIncorrectRecoveryPhrase();
  expect(await onboardingPage.IsInvalidPhraseTextVisible()).toBe(true);
});
