# Appwright

![NPM Version](https://img.shields.io/npm/v/@samsara-dev/appwright?color=4AC61C)

Appwright is a test framework for e2e testing of mobile apps. Appwright builds on top of [Appium](https://appium.io/docs/en/latest/), and can
run tests on local devices, emulators, and remote device farms — for both iOS and Android.

Appwright is one integrated package that combines an automation driver, test runner and test
reporter. To achieve this, Appwright uses the [Playwright](https://github.com/microsoft/playwright) test runner internally, which is
purpose-built for the e2e testing workflow.

Appwright exposes an ergonomic API to automate user actions. These actions auto-wait and auto-retry
for UI elements to be ready and interactable, which makes your tests easier to read and maintain.

```ts
import { test, expect } from "@samsara-dev/appwright";

test("User can login", async ({ device }) => {
  await device.getByText("Username").fill("admin");
  await device.getByText("Password").fill("password");
  await device.getByText("Login").tap();
});
```

Links to help you get started.

- [Example project](https://github.com/empirical-run/appwright/tree/main/example)
- [Launch blog post](https://www.empirical.run/blog/appwright)
- [Documentation](#docs)

## Usage

### Minimum requirements

- Node 20.19.0 or higher (Appium 3 requirement)

### Install

```sh
npm i --save-dev @samsara-dev/appwright
touch appwright.config.ts
```

### Configure

```ts
// In appwright.config.ts
import { defineConfig, Platform } from "@samsara-dev/appwright";
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
              You can choose between `browserstack`, `lambdatest`, `emulator`, or `local-device`.

- `buildPath`: The path to your build file. For Android, it should be an APK file.
               For iOS, if you are running tests on real device, it should be an `.ipa` file. For running tests on an emulator, it should be a `.app` file.

### Run tests

To run tests, you need to specify the project name with `--project` flag.

```sh
npx appwright test --project android
npx appwright test --project ios
```

#### Run tests on BrowserStack

Appwright supports BrowserStack out of the box. To run tests on BrowserStack, configure
the provider in your config.

```ts
{
  name: "android",
  use: {
    platform: Platform.ANDROID,
    device: {
      provider: "browserstack",
      // Specify device to run the tests on
      // See supported devices: https://www.browserstack.com/list-of-browsers-and-platforms/app_automate
      name: "Google Pixel 8",
      osVersion: "14.0",
      appiumVersion: "3.1.0", // Override if your BrowserStack account does not yet support Appium 3
      appProfiling: true, // Optional: enable BrowserStack App Performance profiling
      idleTimeout: 300, // Optional: max session idle time in seconds (default: 180)
    },
    buildPath: "app-release.apk",
  },
},
```

#### Run tests on LambdaTest

Appwright supports LambdaTest out of the box. To run tests on LambdaTest, configure
the provider in your config.

```ts
{
  name: "android",
  use: {
    platform: Platform.ANDROID,
    device: {
      provider: "lambdatest",
      // Specify device to run the tests on
      // See supported devices: https://www.lambdatest.com/list-of-real-devices
      name: "Pixel 8",
      osVersion: "14",
      appiumVersion: "3.1.0", // Override if your LambdaTest account does not yet support Appium 3
    },
    buildPath: "app-release.apk",
  },
},
```

## Run the sample project

To run the sample project:

- Navigate to the `example` directory.

```sh
cd example
```

- Install dependencies.

```sh
npm install
```

- Run the tests

Run the following command to execute tests on an Android emulator:

```sh
npx appwright test --project android
```

To run the tests on iOS simulator:

- Unzip the `wikipedia.zip` file

```sh
npm run extract:app
```
- Run the following command:

```sh
npx appwright test --project ios
```

## Docs

- [Basics](docs/basics.md)
- [Configuration](docs/config.md)
- [Locators](docs/locators.md)
- [Assertions](docs/assertions.md)
- [API reference](docs/api-reference.md)
