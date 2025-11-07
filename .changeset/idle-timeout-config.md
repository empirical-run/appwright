---
"@samsara-dev/appwright": patch
---

Add configurable idle timeout for BrowserStack provider

Users can now configure the idle timeout for BrowserStack sessions using the `idleTimeout` property in the device configuration. This sets the maximum time (in seconds) a session can remain idle without receiving any commands before BrowserStack terminates it. The default value remains 180 seconds (3 minutes) for backward compatibility.

Example usage:
```ts
device: {
  provider: "browserstack",
  name: "Google Pixel 8",
  osVersion: "14.0",
  idleTimeout: 300, // Optional: 5 minutes
}
```