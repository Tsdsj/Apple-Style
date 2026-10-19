// Plain CSS, no library: backdrop-filter blur at 8–40px. In headless Chromium 141
// here, radii >= 20px leave the text behind visibly sharp (see ../compare/headless-backdrop-blur.png).
// Run with the website config and testMatch overridden, or copy into any Playwright project.
const { test } = require('@playwright/test');
test('plain backdrop blur radii', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 260 });
  await page.setContent(`<!doctype html><html><body style="margin:0">
    <p style="font:700 40px/1.2 sans-serif;margin:0">${'Behind the glass text '.repeat(40)}</p>
    ${[8, 14, 20, 30, 40].map((r, i) => `<div style="position:absolute;top:40px;left:${10 + i * 215}px;width:200px;height:160px;border-radius:24px;backdrop-filter:blur(${r}px);background:rgb(255 255 255/.7);font:12px sans-serif">blur ${r}px</div>`).join('')}
  </body></html>`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: require('path').join(process.env.OUT || require('os').tmpdir(), 'headless-backdrop-blur.png') });
});
