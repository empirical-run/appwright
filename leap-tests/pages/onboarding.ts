import { ELEMENT_TIMEOUT, OnboardingType, pin } from "./constants";
import { AppwrightDriver } from "../../src/providers/driver";
import { expect } from "../../src/fixture";

export class OnboardingPage {
  readonly client: AppwrightDriver;
  enterPinSelector: string = "";
  choosePinSelector: string = "";
  newWalletButtonSelector: string = "";
  importWalletButtonSelector: string = "";
  copyButtonSelector: string = "";
  recoveryPhraseButtonSelector: string = "";
  confirmButtonSelector: string = "";
  recoveryPhraseComponentSelector: string = "";
  inputAt4Selector: string = "";
  inputAt7Selector: string = "";
  inputAt11Selector: string = "";
  invalidPhraseSelector: string = "";
  dashboardTextSelector: string = "";
  seedPhraseButtonSelector: string = "";
  keplrButtonSelector: string = "";
  invalidImportPhraseSelector: string = "";
  textFieldSelector: string = "";
  importUsingKeplrButton: string = "";
  importKeplrWalletButtonSelector: string = "";
  importWalletSeedPhraseButtonSelector: string = "";
  enableNotificationsSelector: string = "";
  constructor(client: AppwrightDriver) {
    this.client = client;
    this.setSelector();
  }

  setSelector() {
    if (this.client.isAndroid()) {
      this.enterPinSelector = `//android.widget.TextView[@text="Enter your PIN"]`;
      this.choosePinSelector = `//android.widget.TextView[@text="Choose Your PIN"]`;
      this.newWalletButtonSelector = `//android.view.ViewGroup[@resource-id="create_wallet_button"]/android.view.ViewGroup`;
      this.importWalletButtonSelector = `//android.view.ViewGroup[@resource-id="import_wallet_button"]/android.view.ViewGroup`;
      this.copyButtonSelector = `//android.widget.TextView[@text="Copy to clipboard"]`;
      this.recoveryPhraseButtonSelector = `//android.widget.TextView[@text="Yes, I have saved it somewhere safe"]`;
      this.confirmButtonSelector = '//android.widget.TextView[@text="Confirm"]';
      this.recoveryPhraseComponentSelector =
        '//android.widget.TextView[@text="Recovery Phrase"]';
      this.inputAt4Selector =
        '//android.widget.EditText[@resource-id="inputAt4"]';
      this.inputAt7Selector =
        '//android.widget.EditText[@resource-id="inputAt7"]';
      this.inputAt11Selector =
        '//android.widget.EditText[@resource-id="inputAt11"]';
      this.invalidPhraseSelector =
        '//android.widget.TextView[@text="Enter correct 4th, 7th, 11th word"]';
      this.dashboardTextSelector =
        '//android.widget.TextView[@text="YOUR PORTFOLIO"]';
      this.invalidImportPhraseSelector = `//android.widget.TextView[@resource-id="text_input_error"]`;
      this.textFieldSelector = `//android.widget.EditText[@resource-id="import_input"]`;
      this.importUsingKeplrButton = `//android.widget.TextView[@text="Import Keplr"]/..`;
      this.importKeplrWalletButtonSelector = `//android.widget.TextView[@text="Import Keplr wallet"]`;
      this.seedPhraseButtonSelector = `//android.widget.TextView[@text="Using recovery phrase"]/..`;
      this.importWalletSeedPhraseButtonSelector = `//android.widget.TextView[@text="Import wallet"]/..`;
      this.enableNotificationsSelector = `(//android.widget.TextView[@text="Enable Notifications"])[2]`;
    }
  }

  async enterPin() {
    await this.client.isVisible('//android.widget.TextView[@text="1"]');
    const isEnterPinVisible = await this.client.isVisible(
      this.enterPinSelector,
      { timeout: 20_000 },
    );
    if (!isEnterPinVisible) {
      await this.inputPin();
    }
    await this.inputPin();
  }

  async importWalletWithPhrase(type: OnboardingType, phrase: string) {
    await this.client.click(this.importWalletButtonSelector);
    await this.importWalletBasedOnType(type, phrase);
  }

  async createWalletWithCorrectRecoveryPhrase() {
    await this.client.click(this.newWalletButtonSelector);
    await this.copyAndPastePhrase(12);
  }

  async createWalletWithIncorrectRecoveryPhrase() {
    await this.client.click(this.newWalletButtonSelector);
    await this.client.click(this.recoveryPhraseButtonSelector);

    await this.client.fill(this.inputAt4Selector, "wrong");
    await this.client.fill(this.inputAt7Selector, "recovery");
    await this.client.fill(this.inputAt11Selector, "phrase");
    await this.client.click(this.confirmButtonSelector);
  }

  private async copyAndPastePhrase(seedPhraseLength: number) {
    let words: string[] = [];
    await this.client.click(this.copyButtonSelector);
    const clipboardBase64 = await this.client.getClipboard();
    console.log("Clipboard text Base64:", clipboardBase64);
    const clipboardText = Buffer.from(clipboardBase64, "base64").toString(
      "utf-8",
    );
    words = clipboardText.split(" ");
    console.log("Words:", words);
    expect(words.length).toBe(seedPhraseLength);
    await this.client.click(this.recoveryPhraseButtonSelector);
    await this.client.fill(this.inputAt4Selector, words[3]!);
    await this.client.fill(this.inputAt7Selector, words[6]!);
    await this.client.fill(this.inputAt11Selector, words[10]!);
    await this.client.click(this.confirmButtonSelector);
  }

  async isDashboardVisible(): Promise<boolean> {
    if (await this.client.isVisible(this.enableNotificationsSelector)) {
      await this.client.click(this.enableNotificationsSelector);
      await this.client.tapAtGivenCoordinates({ x: 129, y: 996 });
    }
    return await this.client.isVisible(this.dashboardTextSelector);
  }

  async IsInvalidPhraseTextVisible() {
    return await this.client.isVisible(this.invalidPhraseSelector, {
      timeout: ELEMENT_TIMEOUT,
    });
  }

  private async inputPin() {
    for (const digit of pin) {
      await this.client.click(this.getKeySelector(digit));
    }
  }

  private getKeySelector(digit: string): string {
    if (this.client.isAndroid()) {
      return `//android.widget.TextView[@text="${digit}"]`;
    } else {
      return "";
    }
  }

  async importWalletBasedOnType(type: OnboardingType, phrase: string) {
    await this.client.click(
      OnboardingType.SEED_PHRASE
        ? this.seedPhraseButtonSelector
        : this.importUsingKeplrButton,
    );
    await this.client.fill(this.textFieldSelector, phrase);
    await this.client.click(
      OnboardingType.SEED_PHRASE
        ? this.importWalletSeedPhraseButtonSelector
        : this.importKeplrWalletButtonSelector,
    );
  }
}
