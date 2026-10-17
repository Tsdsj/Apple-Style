// Evaluation-only config (CI runs tests/browser). Serves the repository root.
const path = require('path');
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: __dirname, testMatch: 'check.spec.js', workers: 1,
  outputDir: path.join(__dirname, '.test-results'),
  use: { browserName: 'chromium', headless: true, ...(process.env.CHROMIUM ? { launchOptions: { executablePath: process.env.CHROMIUM } } : {}) },
  webServer: { command: 'python3 -m http.server 8767 --bind 127.0.0.1', cwd: path.join(__dirname, '../../..'), url: 'http://127.0.0.1:8767', reuseExistingServer: true },
});
