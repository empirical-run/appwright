# Appwright

![NPM Version](https://img.shields.io/npm/v/appwright?color=4AC61C)

Appwright is a test runner for e2e testing of mobile apps, based on Playwright and Appium.

## Usage

### Install

```sh {"id":"01J8PCK0BB23X53P03AY3JYQGW"}
npm i --save-dev appwright
touch appwright.config.ts
```

### Configure

```ts {"id":"01J8PCK0BB23X53P03B0X6PMN8"}
// In appwright.config.ts
import { defineConfig, Platform } from "appwright";
export default defineConfig({
  projects: [
    {
      name: "android",
      use: {
        platform: Platform.ANDROID,
        deviceName: "Google Pixel 8",
        osVersion: "14.0",
        buildURL: process.env.BROWSERSTACK_APP_URL,
      },
    },
  ],
});
```

### Run tests

Appwright currently runs tests on BrowserStack only.

```sh {"id":"01J8PCK0BB23X53P03B22TBR01"}
npx appwright test --project android
npx appwright test --project ios
```

These environment variables are required:

- BROWSERSTACK_USERNAME
- BROWSERSTACK_ACCESS_KEY
- BROWSERSTACK_APP_URL

## Development

### Install dependencies

```bash {"id":"01J8PCK0BB23X53P03B5FPVFE5"}
npm install
```
