// Evaluation-only config. SITE, PORT, OUT and AXE come from the environment
// (see check-site.spec.js); CHROMIUM optionally points at a preinstalled browser.
const path = require('path');
const { defineConfig } = require('@playwright/test');
const site = path.resolve(process.env.SITE || '.');
module.exports = defineConfig({
  testDir: __dirname, testMatch: "check-site.spec.js", workers: 1, timeout: 120000,
  outputDir: path.join(require('os').tmpdir(), 'apple-style-website-eval-' + process.env.PORT),
  use: { browserName: 'chromium', headless: true, ...(process.env.CHROMIUM ? { launchOptions: { executablePath: process.env.CHROMIUM } } : {}) },
  webServer: { command: `python3 ${path.join(__dirname, 'serve.py')} ${site} ${process.env.PORT}`, url: `http://127.0.0.1:${process.env.PORT}/`, reuseExistingServer: false },
});
