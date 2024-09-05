import { Client } from "webdriver";
import { waitAndClick, isElementVisibleWithinTimeout, setValue } from "../../utils/actions";
import test, { expect } from "@playwright/test";
import { ELEMENT_TIMEOUT, pin } from "./constants";

export class OnboardingPage{
    readonly client: Client
    enterPinSelector: string
    choosePinSelector: string
    newWalletButtonSelector: string
    importWalletButtonSelector: string
    copyButtonSelector: string
    recoveryPhraseButtonSelector: string
    confirmButtonSelector: string
    recoveryPhraseComponentSelector: string
    inputAt4Selector: string
    inputAt7Selector: string
    inputAt11Selector: string
    invalidPhraseSelector: string
    dashboardTextSelector: string
    constructor(client: Client){
        this.client = client;
        this.setSelector();
    }

    setSelector(){  
        if(this.client.isAndroid){
            this.enterPinSelector = `//android.widget.TextView[@text="Enter your PIN"]`;
            this.choosePinSelector = `//android.widget.TextView[@text="Choose Your PIN"]`
            this.newWalletButtonSelector = `//android.view.ViewGroup[@resource-id="create_wallet_button"]/android.view.ViewGroup`
            this.importWalletButtonSelector = `//android.view.ViewGroup[@resource-id="import_wallet_button"]/android.view.ViewGroup`
            this.copyButtonSelector = `//android.widget.TextView[@text="Copy to clipboard"]`
            this.recoveryPhraseButtonSelector = `//android.widget.TextView[@text="Yes, I have saved it somewhere safe"]`;
            this.confirmButtonSelector = '//android.widget.TextView[@text="Confirm"]',
            this.recoveryPhraseComponentSelector = '//android.widget.TextView[@text="Recovery Phrase"]',
            this.inputAt4Selector = '//android.widget.EditText[@resource-id="inputAt4"]',
            this.inputAt7Selector ='//android.widget.EditText[@resource-id="inputAt7"]',
            this.inputAt11Selector = '//android.widget.EditText[@resource-id="inputAt11"]',
            this.invalidPhraseSelector ='//android.widget.TextView[@text="Enter correct 4th, 7th, 11th word"]',
            this.dashboardTextSelector = '//android.widget.TextView[@text="YOUR PORTFOLIO"]'
        }else{

        }
    }

    async enterPin(){
        await isElementVisibleWithinTimeout(this.client,'//android.widget.TextView[@text="1"]',{ timeout: 20_000 });
        const isEnterPinVisible =  await isElementVisibleWithinTimeout(this.client, this.enterPinSelector,{});
        if(!isEnterPinVisible){
            await test.step("Choose your pin", async ()=> {
                await this.inputPin();
            });
        }
        await test.step("Enter your pin", async ()=> {
                await this.inputPin();
        })
    }

    async createWalletWithCorrectRecoveryPhrase(){
        await test.step("Create new wallet", async ()=> {
            await waitAndClick(this.client,this.newWalletButtonSelector,ELEMENT_TIMEOUT);
            await this.copyAndPastePhrase(12);
        });
    }
    
    async createWalletWithIncorrectRecoveryPhrase(){
        await test.step("Create new wallet", async ()=> {
            await waitAndClick(this.client,this.newWalletButtonSelector,ELEMENT_TIMEOUT);
            await waitAndClick(this.client,this.recoveryPhraseButtonSelector,ELEMENT_TIMEOUT);
        });

        await test.step("Enter incorrect phrase", async ()=> {
            await setValue(this.client,this.inputAt4Selector,"wrong");
            await setValue(this.client,this.inputAt7Selector,"recovery");
            await setValue(this.client,this.inputAt11Selector,"phrase");
            await waitAndClick(this.client,this.confirmButtonSelector);
        });
    }

    private async copyAndPastePhrase(seedPhraseLength: number){
        let words: string[] = [];
        await test.step("Copy the phrase", async ()=> {
            await waitAndClick(this.client,this.copyButtonSelector,ELEMENT_TIMEOUT);
            const clipboardBase64 = await this.client.getClipboard();
            console.log("Clipboard text Base64:", clipboardBase64);
            const clipboardText = Buffer.from(clipboardBase64, "base64").toString(
              "utf-8",
            );
            words = clipboardText.split(" ");
            console.log("Words:", words);
            expect(words.length).toBe(seedPhraseLength);
        });
        await test.step("Paste the phrase", async ()=> {
            await waitAndClick(this.client,this.recoveryPhraseButtonSelector,ELEMENT_TIMEOUT);
            await setValue(this.client,this.inputAt4Selector,words[3]);
            await setValue(this.client,this.inputAt7Selector,words[6]);
            await setValue(this.client,this.inputAt11Selector,words[10]);
            await waitAndClick(this.client,this.confirmButtonSelector);
        });
    }

    async isDashboardVisible(): Promise<boolean> {
        return test.step("Check if dashboard is visible", async ()=> {
            return await isElementVisibleWithinTimeout(this.client,this.dashboardTextSelector,{timeout: ELEMENT_TIMEOUT});
        });
    }

    async IsInvalidPhraseTextVisible(){
        return test.step("Check if invalid phrase error is visible", async ()=> {
            return await isElementVisibleWithinTimeout(this.client,this.invalidPhraseSelector,{timeout: ELEMENT_TIMEOUT});
        });
    }

    private async inputPin(){
        for (const digit of pin) {
            await test.step(`Clicking button ${digit}`,async () => {
                await waitAndClick(this.client, this.getKeySelector(digit))
            });
        }
    }

    private getKeySelector(digit:string){
        if(this.client.isAndroid){
            return `//android.widget.TextView[@text="${digit}"]`;
        } else{
            return "";
        }
    }
}
