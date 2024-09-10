export const commonConfig = {
  port: 443,
  path: "/wd/hub",
  protocol: "https",
  maxInstances: 1,
  logLevel: "warn",
  coloredLogs: true,
  specFileRetries: 2,
  screenshotPath: "./errorShots/",
  waitforTimeout: 10000,
  connectionRetryTimeout: 300000,
  unlockSuccessTimeout: 300000,
  connectionRetryCount: 3,
  newCommandTimeout: 300000,
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    timeout: 180_000,
  },
  afterTest: async function () {},

  onComplete: async function () {},
};


const browserstackAppURL = process.env.BROWSERSTACK_APP_URL || "";

export const baseBStackOptions = {
  debug: true,
  interactiveDebugging: true,
  networkLogs: true,
  idleTimeout: 300,
  projectName: "Leap Wallet Tests",
  appiumVersion: "2.6.0",
  enableCameraImageInjection: true,
};

export const browserstackConfig = {
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  hostname: "hub.browserstack.com",
  services: [
    "browserstack",
    {
      buildIdentifier: "${BUILD_NUMBER}",
      opts: { forcelocal: false, localIdentifier: "Leap_Wallet_Tests" },
    },
  ],
};

export const config = {
  ...commonConfig,
  ...browserstackConfig,
  capabilities: {
    "bstack:options": {
      ...baseBStackOptions,
      deviceName: "Google Pixel 8",
      osVersion: "14.0",
      platformName: "android",
      buildName: "Leap Android build",
      sessionName: "Bstack Android Leap Tests",
    },
    "appium:autoGrantPermissions": true,
    "appium:app": browserstackAppURL,
  },
};
