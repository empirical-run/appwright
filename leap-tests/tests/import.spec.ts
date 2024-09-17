import {
  ELEMENT_TIMEOUT,
  INVALID_KEY,
  OnboardingType,
} from "../pages/constants";
import { OnboardingPage } from "../pages/onboarding";
import {
  PRIVATE_KEY_SMALL_USER,
  SEED_PHRASE_12_USER,
  SEED_PHRASE_24_USER,
} from "../test-data";
import { expect, test } from "../../src/index";

test("Import wallet using 12 words Seed Phrase", async ({ client }) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.importWalletWithPhrase(
    OnboardingType.SEED_PHRASE,
    SEED_PHRASE_12_USER.phrase,
  );
  await expect(client.getByText("YOUR PORTFOLIO")).toBeVisible({
    timeout: ELEMENT_TIMEOUT,
  });
});

test("Import wallet using 24 words Seed Phrase", async ({ client }) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.importWalletWithPhrase(
    OnboardingType.SEED_PHRASE,
    SEED_PHRASE_24_USER.phrase,
  );
  await expect(client.getByText("YOUR PORTFOLIO")).toBeVisible({
    timeout: ELEMENT_TIMEOUT,
  });
});

test("Import wallet using Private Key", async ({ client }) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.importWalletWithPhrase(
    OnboardingType.SEED_PHRASE,
    PRIVATE_KEY_SMALL_USER.privateKey,
  );
  await expect(client.getByText("YOUR PORTFOLIO")).toBeVisible({
    timeout: ELEMENT_TIMEOUT,
  });
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
  await expect(client.getByText("Invalid Private Key")).toBeVisible();
});

test("Import wallet using Keplr 12 words seed phrase", async ({ client }) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.importWalletWithPhrase(
    OnboardingType.KEPLR,
    SEED_PHRASE_12_USER.phrase,
  );
  await expect(client.getByText("YOUR PORTFOLIO")).toBeVisible({
    timeout: ELEMENT_TIMEOUT,
  });
});

test("Import wallet using Keplr 24 words seed phrase", async ({ client }) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.importWalletWithPhrase(
    OnboardingType.KEPLR,
    SEED_PHRASE_24_USER.phrase,
  );
  await expect(client.getByText("YOUR PORTFOLIO")).toBeVisible({
    timeout: ELEMENT_TIMEOUT,
  });
});

test("Entering non-dictionary word in Keplr should show invalid key error", async ({
  client,
}) => {
  const onboardingPage = new OnboardingPage(client);
  await onboardingPage.enterPin();
  await onboardingPage.importWalletWithPhrase(
    OnboardingType.KEPLR,
    INVALID_KEY,
  );
  await expect(client.getByText("Invalid Private Key")).toBeVisible();
});
