import { INVALID_KEY, OnboardingType } from "../pages/constants";
import { OnboardingPage } from "../pages/onboarding";
import { SEED_PHRASE_12_USER, SEED_PHRASE_24_USER } from "../test-data";
import { expect, test } from "../../src/index";

test("Import wallet using 12 words Seed Phrase", async ({ client }) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.importWalletWithPhrase(
    OnboardingType.SEED_PHRASE,
    SEED_PHRASE_12_USER.phrase,
  );
  await expect(
    client.locator(onboardingPage.dashboardTextSelector),
  ).toBeVisible();
});

test("Import wallet using 24 words Seed Phrase", async ({ client }) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.importWalletWithPhrase(
    OnboardingType.SEED_PHRASE,
    SEED_PHRASE_24_USER.phrase,
  );
  await expect(
    client.locator(onboardingPage.dashboardTextSelector),
  ).toBeVisible();
});

test("Entering non-dictionary word in seed phrase should show invalid key error", async ({
  client,
}) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.importWalletWithPhrase(
    OnboardingType.SEED_PHRASE,
    INVALID_KEY,
  );
  await expect(
    client.locator(onboardingPage.invalidImportPhraseSelector),
  ).toBeVisible();
});
