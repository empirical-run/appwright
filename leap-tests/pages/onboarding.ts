import { OnboardingType, pin } from "./constants";
import { AppwrightDriver } from "../../src/providers/driver";

export class OnboardingPage {
  readonly client: AppwrightDriver;
  constructor(client: AppwrightDriver) {
    this.client = client;
  }

  async enterPin() {
    await this.client.getByText("1").isVisible();
    const isEnterPinVisible = await this.client
      .getByText("Enter your PIN")
      .isVisible();
    if (!isEnterPinVisible) {
      await this.inputPin();
    }
    await this.inputPin();
  }

  async importWalletWithPhrase(type: OnboardingType, phrase: string) {
    await this.client
      .getByText("Import an existing wallet", { exact: true })
      .click();
    await this.importWalletBasedOnType(type, phrase);
  }

  async createWalletWithIncorrectRecoveryPhrase() {}

  async enterPhrase() {
    let words: string[] = [];
    await this.client
      .getByText(
        this.client.isAndroid() ? "Copy to clipboard" : " Copy to clipboard",
        { exact: true },
      )
      .click();
    const clipboardBase64 = await this.client.getClipboard();
    console.log("Clipboard text Base64:", clipboardBase64);
    const clipboardText = Buffer.from(clipboardBase64, "base64").toString(
      "utf-8",
    );
    words = clipboardText.split(" ");
    console.log("Words:", words);
    await this.client
      .getByText("Yes, I have saved it somewhere safe", { exact: true })
      .click();
    await this.client.getById("inputAt4").fill(words[3]!);
    await this.client.getById("inputAt7").fill(words[6]!);
    await this.client.getById("inputAt11").fill(words[10]!);
    if (!this.client.isAndroid()) {
      await this.client.getByText("return").click();
    }
    await this.client.getByText("Confirm", { exact: true }).click();
  }

  private async inputPin() {
    for (const digit of pin) {
      await this.client.getByText(digit, { exact: true }).click();
    }
  }

  async importWalletBasedOnType(type: OnboardingType, phrase: string) {
    await this.client
      .getByText(
        OnboardingType.SEED_PHRASE
          ? this.client.isAndroid()
            ? "Using recovery phrase"
            : " Using recovery phrase "
          : this.client.isAndroid()
            ? "Import Keplr"
            : "Import Keplr ",
        { exact: true },
      )
      .click();
    await this.client
      .getByText(
        this.client.isAndroid()
          ? "Enter / Paste wallet recovery phrase or private key here"
          : "Enter / Paste wallet recovery phrase or private key here Paste",
      )
      .fill(phrase);
    await this.client
      .getByText(
        OnboardingType.SEED_PHRASE ? "Import wallet" : "Import Keplr wallet",
        { exact: true },
      )
      .click();
  }
}
