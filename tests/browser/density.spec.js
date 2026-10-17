// data-density="desktop": one coherent 14/20 text, 32 px control tier for
// cross-platform desktop web apps, with 44 px targets kept for touch input.
const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8767';
const page0 = (density, dir = 'ltr') => `<!doctype html><html dir="${dir}" ${density ? `data-density="${density}"` : ''}><head>
  <link rel="stylesheet" href="${base}/skills/Apple-Style/web/apple-style.css"></head><body class="as-body">
  <main id="root">
    <p class="as-text-largetitle as-em" id="title">Title</p><p class="as-text-body" id="bodytext">Body</p>
    <button class="as-button as-button-filled" id="btn">Save</button><button class="as-button as-button-small" id="small">Small</button>
    <button class="as-button as-button-icon" id="icon" aria-label="Add">+</button>
    <div class="as-segmented" role="radiogroup" aria-label="View" id="seg"><button class="as-segment is-selected">One</button><button class="as-segment">Two</button></div>
    <label class="as-search" id="search"><input type="search" aria-label="Search"></label>
    <button class="as-toggle" role="switch" aria-checked="false" aria-label="Wi-Fi" id="toggle"><span class="as-knob"></span></button>
    <div style="width:300px;position:relative"><input class="as-slider" type="range" min="0" max="100" value="30" aria-label="Volume" id="slider"></div>
    <div class="as-glass as-glass-group" id="group"><button class="as-item">Share</button></div>
    <ul class="as-list"><li id="li">Row</li></ul>
    <div class="as-glass as-glass-large as-menu is-open" style="position:static" role="menu"><button class="as-menu-item" role="menuitem" id="menuitem">Copy</button></div>
    <div class="as-split" style="block-size:200px">
      <nav class="as-sidebar" aria-label="Sections"><a class="as-row" href="#a" id="row">Inbox</a></nav>
      <main class="as-content">Content</main>
      <aside class="as-inspector" aria-label="Details"><div class="as-field" id="field"><span>Status</span><span>Open</span></div></aside>
    </div>
  </main><script src="${base}/skills/Apple-Style/web/liquid-glass.js"></script></body></html>`;

async function open(page, density, dir) {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base);
  await page.setContent(page0(density, dir));
  await page.evaluate(() => LiquidGlass.init(document.querySelector('#root')));
  await page.waitForFunction(() => document.getAnimations().length === 0);
}
const sizes = page => page.evaluate(() => {
  const h = id => Math.round(document.getElementById(id).getBoundingClientRect().height);
  const w = id => Math.round(document.getElementById(id).getBoundingClientRect().width);
  const cs = (el, p) => getComputedStyle(typeof el === 'string' ? document.querySelector(el) : el)[p];
  return {
    body: cs('body', 'fontSize'), title: [cs('#title', 'fontSize'), cs('#title', 'fontWeight')], text: cs('#bodytext', 'fontSize'),
    button: [h('btn'), cs('#btn', 'fontSize')], small: h('small'), icon: w('icon'), segmented: h('seg'),
    search: [h('search'), cs('#search input', 'fontSize')], toggle: [w('toggle'), h('toggle')],
    groupItem: Math.round(document.querySelector('#group .as-item').getBoundingClientRect().height),
    list: h('li'), menuItem: h('menuitem'), row: [h('row'), cs('#row', 'fontSize')], field: [h('field'), cs('#field', 'fontSize')],
  };
});

test('without the attribute the iOS tier is unchanged', async ({ page }) => {
  await open(page, null);
  const s = await sizes(page);
  expect(s).toMatchObject({ body: '17px', button: [44, '17px'], segmented: 38, search: [44, '17px'], toggle: [51, 31], menuItem: 44 });
});

test('desktop density scales every component together', async ({ page }) => {
  await open(page, 'desktop');
  expect(await sizes(page)).toEqual({
    body: '14px', title: ['28px', '700'], text: '14px',
    button: [32, '14px'], small: 28, icon: 32, segmented: 32,
    search: [32, '14px'], toggle: [40, 24], groupItem: 28,
    list: 36, menuItem: 32, row: [32, '14px'], field: [32, '14px'],
  });
});

test('desktop switch travels and drags within its smaller track; slider knob sits on the thumb', async ({ page }) => {
  await open(page, 'desktop');
  const toggle = page.locator('#toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await page.waitForFunction(() => document.getAnimations().length === 0);
  const inset = await page.evaluate(() => { const t = toggle.getBoundingClientRect(), k = toggle.querySelector('.as-knob').getBoundingClientRect(); return [Math.round(k.left - t.left), Math.round(t.right - k.right)]; });
  expect(inset).toEqual([18, 2]);
  const b = await toggle.boundingBox();
  await page.mouse.move(b.x + b.width - 6, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width - 14, b.y + b.height / 2, { steps: 3 });
  await page.mouse.move(b.x + 2, b.y + b.height / 2, { steps: 3 }); await page.mouse.up();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  await expect.poll(async () => {
    const [s, k] = [await page.locator('#slider').boundingBox(), await page.locator('.as-slider-knob').boundingBox()];
    return [Math.round(k.width), Math.abs(k.x + k.width / 2 - (s.x + 10 + 0.3 * (s.width - 20))) < 1.5];
  }).toEqual([20, true]);
});

test('desktop switch mirrors in RTL', async ({ page }) => {
  await open(page, 'desktop', 'rtl');
  await page.locator('#toggle').click();
  await page.waitForFunction(() => document.getAnimations().length === 0);
  const inset = await page.evaluate(() => { const t = toggle.getBoundingClientRect(), k = toggle.querySelector('.as-knob').getBoundingClientRect(); return [Math.round(k.left - t.left), Math.round(t.right - k.right)]; });
  expect(inset).toEqual([2, 18]);
});

test.describe('with touch input', () => {
  test.use({ hasTouch: true });
  test('desktop density keeps 44 px targets, 16 px field text and the touch-size switch', async ({ page }) => {
    await open(page, 'desktop');
    const s = await sizes(page);
    expect(s).toMatchObject({ body: '14px', button: [44, '14px'], icon: 44, segmented: 44, search: [44, '16px'], toggle: [51, 31],
      groupItem: 44, list: 44, menuItem: 44, row: [44, '14px'], field: [44, '14px'] });
  });
});
