# Basics

## Write a Test

In Appwright, writing a test is simple and similar to how tests are written in Playwright, but with enhanced mobile capabilities.

## Configure Projects

In Appwright, you can define multiple test configurations for different platforms (Android, iOS, etc.) within your `appwright.config.ts`. This configuration tells Appwright how to run your tests on different devices and environments.

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

## Built-in Fixtures

Appwright provides built-in fixtures like `device`, which offers methods to handle mobile interactions. 

Here’s an example of how to write a basic test using the `device` fixture:

```ts
import { test, expect } from 'appwright';

test('should display the login screen and tap on Login button', async ({ device }) => {

  // Assert that the login button is visible
  await expect(device.getByText('Login')).toBeVisible();
  
  // Tap on the login button
  await device.getByText('Login').tap();
});
```

## Run the Test

To run the test, you can use the `npx appwright test` command.

### Run the test on Android

```sh
npx appwright test --project android
```

### Run the test on iOS

```sh
npx appwright test --project ios
```

Above commands will trigger runs on android and iOS emulators based on the above configuration.

Once the test is completed, the report is launched automatically in the browser.