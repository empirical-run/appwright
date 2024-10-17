# Persistent device

Appwright has a `device` fixture which works at the test-level. Every test gets a new Device
and that ensures the environment for the test is pristine. If your tests require user logins,
every test will need to do some login steps before the test starts. This adds to the test time.

To speed this up, you can use `persistentDevice` fixture which works at the worker-level. Each
worker runs 1 or more tests, and these tests can share the same device. This way, your tests
can login once for the worker, and reuse that state for tests that run in the worker.

Your suite can have a combination of both fixtures:
- Use `device` for onboarding tests (to replicate fresh installs)
- Use `persistentDevice` for post-login tests
  - This is optional: you can still use `device` if you want

## Concepts

- Both fixtures `device` and `persistentDevice` return a `Device` object, so the test code
  is reusable.
  - Each `Device` maps to a WebDriver session internally.
- `device` is created and teared down for every test
- `persistentDevice` is created and teared down for every worker

## Usage

### Parallelism config

By default, Appwright tests in a file are executed in sequential order. Appwright sets the
`fullyParallel` config parameter in the Playwright test runner to `false`. This is
required to support scenarios with `persistentDevice`.

The downside of setting `fullyParallel: false` is that scheduling across workers can
be sub-optimal. A large group of tests that depend on the same `persistentDevice`
can skew worker utilization to just one worker. This can be solved by
- Splitting tests into multiple groups (don't put all of them in one group)
- Track worker utilization of the test run and make changes if required

If your suite does not use `persistentDevice` you can set `fullyParallel: true` in
your Appwright config file. This can be also configured for a file (e.g. a file that
does not use `persistentDevice`).

```ts
// Set fullyParallel behavior for a file
test.describe.configure({ mode: "parallel" });

// Your tests go below
// ...
```

### Structuring tests

Assuming you have a bunch of tests already written in your test suite that
use the `device` fixture. We will migrate them over to using `persistentDevice`.

Steps to choose these tests
- These tests must depend on the same user account
- Semantically, it makes sense to locate these tests in one test file

Steps to implement to group them
- Move these tests to one file
- Define a test-level worker for this group (e.g. `userDeviceForTxnTests`). This
  unique name gives you predictability that only one `persistentDevice` is used by this
  group of tests
- Ensure ordering is what you want, while keeping in mind that:
  - Tests will follow this execution order in the worker, but in the case of a failure
    a new worker will restart the failing test (if it is to be retried)
  - If it is not to be retried, then a new worker will be created to run the next test

### Fixtures in your code

We will use Playwright's [fixtures](https://playwright.dev/docs/test-fixtures) to use
`persistentDevice`.

- Create a worker fixture that depends on `persistentDevice`, say `userDevice`
- In the `userDevice` fix, do the steps required to login for the first time
- Then create a test fixture, `userDeviceForFoo` which has any reset steps that
  need to be run between tests (e.g. go back to home screen of the app)

```ts
import { test as base } from "@playwright/test";
import { Device } from "appwright";

type WorkerFixtures = {
  userDevice: Device;
}
type TestFixtures = {
  userDeviceForFoo: Device;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({

  // Worker fixture that knows how to login
  // This will be called for every worker
  userDevice: [async ({ persistentDevice }, use, workerInfo) => {
    // Do actions on the device
    await persistentDevice.getByText("Login").tap();
    // ...
    // Once done, hand over this to the tests
    await use(persistentDevice);
  }, { scope: 'worker' }],

  // Test fixture that knows how to reset the app for a test
  // This will be called for every test
  userDeviceForFoo: async ({ userDevice }, use, testInfo) => {
    // Hand over the test to the test method
    await use(userDevice);
    // Reset the device
    // e.g. Click the back button
    await userDevice.getByText("Back").tap();
    // Or restart the app on the device
    await userDevice.terminateApp();
    await userDevice.activateApp();
  },

});
```

### Using in the test

Use the test fixture in your test. You can also wrap it into a page object model
and pass that to the test.

```ts
import { test } from './fixtures';

test("do first thing", async ({ userDeviceForFoo }) => {
  // This will run first
  // ...
  // And then do the reset steps in the userDeviceForFoo fixture
});

test("do second thing", async ({ userDeviceForFoo }) => {
  // This will run next
  // ...
  // And then do the reset steps in the userDeviceForFoo fixture
});
```

Things to remember while writing the tests:

- When a test fails inside a worker, a new worker will be created and the test
  will be restarted
- This means that the nth test of a file can be the first test of a worker (e.g. when it
  it is retried after a failure)
- All tests must be written in a way that they can:
  - Run after the previous test
  - Run as the first test in a worker

### Test reporting

WIP: `persistentDevice` does not support video recordings.

## More info

Learn more about [worker process](https://playwright.dev/docs/test-parallel) in the
Playwright test runner.
