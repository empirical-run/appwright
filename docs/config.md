# Configuration

- Configuration
  - Choose which devices to test and device provider (local or BrowserStack)

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
