# Configuration

Appwright provides a set of configuration options that you can use to customize 
the test environment and thus the behavior of the tests.

## Device Providers

Device providers make Appium compatible mobile devices available to Appwright. These
providers are supported:

- `local-device`
- `emulator`
- `browserstack`

### BrowserStack

BrowserStack [App Automate](https://www.browserstack.com/app-automate) can be used to provide
remote devices to Appwright.

These environment variables are required for the BrowserStack

- BROWSERSTACK_USERNAME
- BROWSERSTACK_ACCESS_KEY

BrowserStack also requires `name` and `osVersion` of the device to be set in the projects in appwright config file.

### Android Emulator

To run tests on the Android emulator, ensure the following installations are available. If not, follow these steps:

1. **Install Android Studio**: If not installed, download and install it from [here](https://developer.android.com/studio).
2. **Set Android SDK location**: Open Android Studio, copy the Android SDK location, and set the `ANDROID_HOME` environment variable to the same path.
3. **Check Java Installation**: Verify if Java is installed by running `java -version`. If it's not installed:
   - Install Java using Homebrew: `brew install java`.
   - After installation, run the symlink command provided at the end of the installation process.


To check for available emulators, run the following command:

```sh
$ANDROID_HOME/emulator/emulator --list-avds
```

### iOS Simulator

To run tests on the iOS Simulator, ensure the following installations are available. If not, follow these steps:

1. **Install Xcode**: If not installed, download and install it from [here](https://developer.apple.com/xcode/).
2. **Download iOS Simulator**: While installing Xcode, you will be prompted to select the platform to develop for. Ensure that iOS is selected.

To check for available iOS simulators, run the following command:

```sh
xcrun simctl list
```
