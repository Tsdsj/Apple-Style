const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser', workers: 1,
  use: { browserName: 'chromium', headless: true, viewport: { width: 1024, height: 768 } },
  webServer: { command: 'python3 -m http.server 8767 --bind 127.0.0.1', url: 'http://127.0.0.1:8767', reuseExistingServer: false },
});
