# Appwright

![NPM Version](https://img.shields.io/npm/v/appwright)

Appwright is a test runner for e2e testing of mobile apps, based on Playwright and Appium.

## Usage

### Install

```sh
npm i --save-dev appwright
touch appwright.config.ts
```

### Configure

```ts
// In appwright.config.ts
import { defineConfig, Platform } from "appwright";
export default defineConfig({
  projects: [
    {
      name: "android",
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: "emulator",
          name: "Google Pixel 8",
          osVersion: "14.0",
        }
        buildPath: "app-release.apk",
      },
    },
  ],
});
```

### Run tests

Appwright currently runs tests on BrowserStack only.

```sh
npx appwright test --project android
npx appwright test --project ios
```

## Docs

- [Configuration](docs/config.md)
- [Locators](docs/locators.md)
