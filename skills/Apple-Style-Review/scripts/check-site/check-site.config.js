// Playwright config for check-site.spec.js. Inputs come from the environment (see README.md).
// The spec starts serve.py itself, so this file only sets the runner, browser and output folder.
'use strict';
const path = require('path');

const OUT = path.resolve(process.env.OUT || 'check-site-out');
const CHROMIUM = process.env.CHROMIUM || '';

module.exports = {
  testDir: __dirname,
  testMatch: 'check-site.spec.js',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 900000,
  reporter: [['list']],
  outputDir: path.join(OUT, 'playwright'),
  use: {
    browserName: 'chromium',
    headless: true,
    ...(CHROMIUM ? { launchOptions: { executablePath: CHROMIUM } } : {}),
  },
};
