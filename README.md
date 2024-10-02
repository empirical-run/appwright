# Appwright

![NPM Version](https://img.shields.io/npm/v/appwright?color=4AC61C)

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
          provider: "emulator", // or 'local-device' or 'browserstack'
        },
        buildPath: "app-release.apk",
      },
    },
    {
      name: "ios",
      use: {
        platform: Platform.IOS,
        device: {
          provider: "emulator", // or 'local-device' or 'browserstack'
        },
        buildPath: "app-release.app", // Path to your .app file
      },
    },
  ],
});
```

### Configuration Options

- `platform`: The platform you want to test on, such as 'android' or 'ios'.

- `provider`: The device provider where you want to run your tests.
              You can choose between `browserstack`, `emulator`, or `local-device`.

- `buildPath`: The path to your build file. For Android, it should be an APK file.
               For iOS, if you are running tests on real device, it should be an `.ipa` file. For running tests on an emulator, it should be a `.app` file.

### Run tests

To run tests, you need to specify the project name with `--project` flag.

```sh
npx appwright test --project android
npx appwright test --project ios
```

#### Run tests on browserStack

Appwright supports BrowserStack out of the box. To run tests on BrowserStack, update the provider in above config:

```ts
{
  name: "android",
  use: {
    platform: Platform.ANDROID,
    device: {
      provider: "browserstack", // <-- add this provider

      //Add the device name on which you want to run the tests, you can find the 
      //supported devices here: https://www.browserstack.com/list-of-browsers-and-platforms/app_automate
      name: "Google Pixel 8",

      //Add the OS version on which you want to run the tests.
      osVersion: "14.0",
    },
    buildPath: "app-release.apk",
  },
},
```

## Docs

- [Basics](docs/basics.md)
- [Configuration](docs/config.md)
- [Locators](docs/locators.md)
- [Assertions](docs/assertions.md)
- [References](docs/reference.md)