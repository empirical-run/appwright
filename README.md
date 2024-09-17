# Appwright

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
        deviceName: "Google Pixel 8",
        osVersion: "14.0",
        buildURL: process.env.BROWSERSTACK_APP_URL,
      },
    },
  ],
});
```

### Run tests

Appwright currently runs tests on BrowerStack only.

```sh
npx playwright test --config appwright.config.ts --project android
npx playwright test --config appwright.config.ts --project ios
```

These environment variables are required:

- BROWSERSTACK_USERNAME
- BROWSERSTACK_ACCESS_KEY
- BROWSERSTACK_APP_URL

## Development

### Install dependencies

```bash
npm install
```
