# appwright

## 0.1.45

### Patch Changes

- 146116a: fix: added comments

## 0.1.44

### Patch Changes

- 4074400: fix: video download issue on lambdatest

## 0.1.43

### Patch Changes

- 651cce1: fix: file write error when file is not present

## 0.1.42

### Patch Changes

- ed2762a: fix: provider video download failure should not stop tests

## 0.1.41

### Patch Changes

- 216e9f5: fix: multiple appium session creation

## 0.1.40

### Patch Changes

- fbcbe5a: fix: added capability to enable camera injection using config

## 0.1.39

### Patch Changes

- a3e369d: chore: added docs for vision

## 0.1.38

### Patch Changes

- a5eacf0: feat: added api key in vision APIs

## 0.1.37

### Patch Changes

- 01bb396: fix: move worker video download to reporter
- f7ca94a: fix: updated llm package version to fix the langfuse errors
- 22d3ce8: fix: worker info store needs recursive mkdir

## 0.1.36

### Patch Changes

- 3430e0e: feat: added telemetry for vision methods

## 0.1.35

### Patch Changes

- ed4a96b: chore: update llm package

## 0.1.34

### Patch Changes

- 77b8cd1: fix: ffmpeg error logging

## 0.1.33

### Patch Changes

- 4c3c3ec: chore: improve logs for video trimming job
- 61fd8d2: fix: added option for caching in vision tap calls
- fc9879c: feat: capture persistentDevice worker info in a file on disk
- 3dbf6ba: docs: fix persistent device parallelism section

## 0.1.32

### Patch Changes

- 070625f: fix: handle ffmpeg error on trimming video
- 56b131e: feat: decorate device methods for reporting

## 0.1.31

### Patch Changes

- b65f3db: fix: increased idle timeout in bs to 180 seconds

## 0.1.30

### Patch Changes

- 1b89ea4: fix: updated check for http url

## 0.1.29

### Patch Changes

- 896541e: support bs:// and lt:// app urls for providers
- b2de667: feat: log device.pause and skip it on CI environments

## 0.1.28

### Patch Changes

- 5bbd6e2: fix: increase maxDepth to 62

## 0.1.27

### Patch Changes

- 8fa6fca: fix: scale tap coordinates only by width for lambdatest getWindowRect() behavior
- 202ad6d: feat: added method to fill input fields using device

## 0.1.26

### Patch Changes

- c86131d: fix: added boxed step in scroll

## 0.1.25

### Patch Changes

- ed5f069: chore: upgrade llm/vision to 0.9.12

## 0.1.24

### Patch Changes

- 89afbf5: fix: added try catch in close session

## 0.1.23

### Patch Changes

- 3930289: feat: use drag method for ios scroll

## 0.1.22

### Patch Changes

- bccffd2: feat: add device.pause() and device.waitForTimeout() methods
- e1e3750: feat: vision.tap returns tap coordinates, vision.query accepts screenshot as option

## 0.1.21

### Patch Changes

- 029a708: fix: move assets location

## 0.1.20

### Patch Changes

- c91b815: fix: vision tap precision

## 0.1.19

### Patch Changes

- f43c977: chore: add log for worker teardown

## 0.1.18

### Patch Changes

- 168425b: feat: add locator.waitFor to check for attached or visible state

## 0.1.17

### Patch Changes

- 6aae307: feat: find ffmpeg path or install it
- a620d3c: fix: use promise.allSettled in reporter

## 0.1.16

### Patch Changes

- 13e5451: feat: move video downloader into a reporter
- 40540b1: feat: download and attach video for persistentDevice
- 3ed1b65: docs: persistent device
- 551b1dc: chore: minor docs and logging changes
- 289f2b4: feat: trim video for persistentDevice report with local ffmpeg

## 0.1.15

### Patch Changes

- 2be3c09: test: locator tests for isVisible method
- 32b5e24: chore: rename error log messages and ActionOptions
- 0c0c0df: chore: add custom errors for timeout and retryable

## 0.1.14

### Patch Changes

- 3de990b: fix: save videos not working

## 0.1.13

### Patch Changes

- 49dc470: feat: add persistentDevice as worker-level fixture
- 49dc470: feat: add methods for terminateApp and activateApp

## 0.1.12

### Patch Changes

- 44f9a4a: feat: added capability to select model in vision methods
- b8ff829: feat: optimize regex locator by identify simple groups in the pattern
- 5626697: feat: add appBundleId to config and make it mandatory for lambdatest
- 21a4b2c: chore: setup tests with vitest

## 0.1.11

### Patch Changes

- c86db58: feat: attach annotated images from vision calls to the report

## 0.1.10

### Patch Changes

- bbba9c5: fix: removed LambdaTest network capability

## 0.1.9

### Patch Changes

- 5d05bdc: feat: added scroll capabilities in appwright

## 0.1.8

### Patch Changes

- 1b83e1c: feat: support for landscape device orientation

## 0.1.7

### Patch Changes

- 961019c: fix: wait to download all videos and attach to report

## 0.1.6

### Patch Changes

- 80a4c6a: fix: remove await while downloading video from provider in saveVideo fixture

## 0.1.5

### Patch Changes

- ef1a2b8: fix: increased idle timeout for LambdaTest

## 0.1.4

### Patch Changes

- 65e2ca7: feat: added lambdatest support in appwright

## 0.1.3

### Patch Changes

- 197c3e2: chore: added-docs-in-npmignore

## 0.1.2

### Patch Changes

- 940ea32: fix: updated playwright version and removed exponential delays between retries

## 0.1.1

### Patch Changes

- 415f940: fix: removed check for installed emulator when running on real device

## 0.1.0

### Minor Changes

- 1e663d4: chore: updated docs and references

## 0.0.41

### Patch Changes

- 6bc5d18: fix: handle already running appium server
- 93386ad: fix: Move list and html reporter out of example and add them as default in appwright

## 0.0.40

### Patch Changes

- e9ca490: fix: removed console logs from bin

## 0.0.39

### Patch Changes

- 1e97b20: fix: references doc link

## 0.0.38

### Patch Changes

- 59d9e3d: chore: updated readme and docs

## 0.0.37

### Patch Changes

- afd436d: chore: remove example from npm package

## 0.0.36

### Patch Changes

- 0a3c34b: chore: updated `mockCameraView` method name

## 0.0.35

### Patch Changes

- b763d60: chore: eslint error in example
- 30712fd: feat: local device config now supports optional udid parameter
- 7b95f16: feat: added capability to perform browserStack camera injection using appwright
- 848108e: feat: multi activity support

## 0.0.34

### Patch Changes

- 14e72b7: chore: added npm script to extract app file

## 0.0.33

### Patch Changes

- 0a35685: fix: correct project not getting selected with `--project` flag

## 0.0.32

### Patch Changes

- ba88b2f: Buildpath validation
- 4f49719: chore: update error strings and add doc links

## 0.0.31

### Patch Changes

- f7bd426: feat: add support for test.skip if llm keys are not available

## 0.0.30

### Patch Changes

- f34bb56: fix: run global setup only for provided project

## 0.0.29

### Patch Changes

- a512d15: feat: add reinstallation of drivers

## 0.0.28

### Patch Changes

- c2efc55: fix: error running tests due to missing appium drivers

## 0.0.27

### Patch Changes

- db747d5: fix: add driver dependencies to appium

## 0.0.26

### Patch Changes

- 7b8d39a: feat: error message for udid for ios

## 0.0.25

### Patch Changes

- 62c6759: fix: app bundle id for browserstack provider

## 0.0.24

### Patch Changes

- 4951c96: fix: install appium driver if not installed already

## 0.0.23

### Patch Changes

- dcee15e: chore: update doc strings

## 0.0.22

### Patch Changes

- 8563e13: chore: remove verbose logs
- df08327: feat: added support to run appwright on local device

## 0.0.21

### Patch Changes

- 99a557c: fix: validation for config.globalSetup

## 0.0.20

### Patch Changes

- b210e79: fix: build upload validation in browserstack provider
- 9266137: chore: warning for globalSetup config behavior

## 0.0.19

### Patch Changes

- b8e6947: feat: support buildPath and build uploads with globalSetup
- 10c7397: fix: pick correct browserstack build url

## 0.0.18

### Patch Changes

- 6458d17: chore: refactored device provider methods
- 1b26228: fix: webdriver client getting passed as undefined to device

## 0.0.17

### Patch Changes

- ee98722: chore: refactored appwright APIs

## 0.0.16

### Patch Changes

- 8c04904: fix: remove custom reporter

## 0.0.15

### Patch Changes

- b9f5c3d: chore: move boxedStep to util and add locator docstrings
- 912b092: chore: rename internal classes for readability
- 2d1c600: feat: rename tap method
- 8febdb4: fix: added `boxedStep` decorator to actions
- 3abaabe: fix: corrected import for driver

## 0.0.14

### Patch Changes

- ebfb243: feat: added capability to search element using regex

## 0.0.13

### Patch Changes

- 4cb2069: feat: expose npx appwright bin

## 0.0.12

### Patch Changes

- 984a468: feat: added method to send keyboard key events

## 0.0.11

### Patch Changes

- 38fd3a3: fix: retry counts in waitUntil

## 0.0.10

### Patch Changes

- f22bdfb: feat: added llm vision in appwright

## 0.0.9

### Patch Changes

- e6989c9: fix: pick expect timeout from appwright config

## 0.0.8

### Patch Changes

- c6910dc: feat: added method getByXpath to get elements by xpath

## 0.0.7

### Patch Changes

- 5ab5fc8: chore: removed tests and configs from appwright

## 0.0.6

### Patch Changes

- 4dc686c: feat: added `getByText` and `getById` methods on driver
