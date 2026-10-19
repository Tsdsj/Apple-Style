// Website patterns (plan 2.1–2.3, 1.7): header, narrow disclosure navigation and footer.
// Fixture: tests/fixtures/site-patterns.html loads the core layers, the three pattern files and site-nav.js.
// Chromium only; no axe (not installed). Contrast is computed from the composited colours instead.
const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8767';
const fixture = `${base}/tests/fixtures/site-patterns.html`;

async function open(page, { width = 1280, height = 800, scheme = 'light', forced = false, reduce = true } = {}) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({
    colorScheme: scheme, reducedMotion: reduce ? 'reduce' : 'no-preference', forcedColors: forced ? 'active' : 'none',
  });
  await page.goto(fixture);
  await page.waitForFunction(() => window.SiteNav !== undefined && document.readyState === 'complete');
}

const toggle = page => page.locator('.as-site-nav-toggle');
const links = page => page.locator('.as-site-nav-links a');

// Composites every ancestor background from white down, then the text colour (WCAG ratio).
async function stackedContrast(page, selector) {
  return page.evaluate(sel => {
    const el = document.querySelector(sel), c = document.createElement('canvas'); c.width = c.height = 1;
    const x = c.getContext('2d', { willReadFrequently: true });
    const chain = []; for (let n = el; n; n = n.parentElement) chain.unshift(n);
    x.fillStyle = '#fff'; x.fillRect(0, 0, 1, 1);
    for (const n of chain) { x.fillStyle = getComputedStyle(n).backgroundColor; x.fillRect(0, 0, 1, 1); }
    const bg = [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
    x.fillStyle = getComputedStyle(el).color; x.fillRect(0, 0, 1, 1);
    const fg = [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
    const lum = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
    const [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  }, selector);
}

test.describe('narrow navigation disclosure (2.2, 1.7)', () => {
  test('at 390px Enter opens the panel, Tab moves into it, Escape closes it and returns focus to the toggle', async ({ page }) => {
    await open(page, { width: 390 });
    await expect(toggle(page)).toBeVisible();
    await expect(toggle(page)).toHaveAccessibleName('Menu');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(links(page).first()).toBeHidden();
    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(links(page).first()).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(links(page).first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle(page)).toBeFocused();
    await expect(links(page).first()).toBeHidden();
  });

  test('a press outside closes the panel without moving focus, and activating a link closes it', async ({ page }) => {
    await open(page, { width: 390 });
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#features h2').click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await toggle(page).click();
    await links(page).nth(1).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveURL(/#pricing$/);
  });

  test('resizing to desktop width closes the panel, hides the toggle and shows the links inline', async ({ page }) => {
    await open(page, { width: 390 });
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(toggle(page)).toBeHidden();
    await expect(links(page).first()).toBeVisible();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('destroy() removes the listeners and restores the no-JavaScript markup', async ({ page }) => {
    await open(page, { width: 390 });
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    const result = await page.evaluate(() => {
      SiteNav.init(document.querySelector('[data-site-nav]')).destroy();
      const t = document.querySelector('.as-site-nav-toggle');
      const before = t.getAttribute('aria-expanded');
      t.click();
      return { before, after: t.getAttribute('aria-expanded'), enhanced: document.querySelector('[data-site-nav]').hasAttribute('data-enhanced'), hidden: t.hidden };
    });
    expect(result).toEqual({ before: 'false', after: 'false', enhanced: false, hidden: true });
  });
});

test('without JavaScript at 390px every link is visible and inside the viewport, and the toggle is hidden', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  await page.goto(fixture);
  await expect(page.locator('.as-site-nav-toggle')).toBeHidden();
  const all = await links(page).all();
  expect(all.length).toBe(3);
  for (const link of all) {
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.querySelector('[data-site-nav]').hasAttribute('data-enhanced'))).toBe(false);
  await context.close();
});

test('at 1280px the links sit in one row, and the current page is marked by more than colour', async ({ page }) => {
  await open(page, { width: 1280 });
  await expect(toggle(page)).toBeHidden();
  const tops = await links(page).evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  const style = sel => page.locator(sel).first().evaluate(el => { const s = getComputedStyle(el); return { underline: s.textDecorationLine, weight: s.fontWeight, color: s.color }; });
  const current = await style('.as-site-nav-links a[aria-current="page"]');
  const other = await style('.as-site-nav-links a:not([aria-current])');
  expect(current.underline).toBe('underline');
  expect(other.underline).toBe('none');
  expect(current.weight).not.toBe(other.weight);
  expect(current.color).toBe(other.color);
});

test('the header stays at the top while scrolling, and an anchor target is not hidden under it', async ({ page }) => {
  await open(page, { width: 1280 });
  expect(await page.locator('.as-site-header').evaluate(el => getComputedStyle(el).position)).toBe('sticky');
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect.poll(() => page.locator('.as-site-header').evaluate(el => el.getBoundingClientRect().top)).toBe(0);
  await page.locator('.as-site-nav-links a[href="#pricing"]').click();
  await expect.poll(() => page.evaluate(() => document.getElementById('pricing').getBoundingClientRect().top
    - document.querySelector('.as-site-header').getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(0);
});

test('the footer does not overflow at 320px', async ({ page }) => {
  await open(page, { width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect(await page.locator('.as-site-footer').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('footer link lists are not underlined, and a link inside a footer paragraph is', async ({ page }) => {
  await open(page);
  const decoration = sel => page.locator(sel).first().evaluate(el => getComputedStyle(el).textDecorationLine);
  expect(await decoration('.as-site-footer-list a')).toBe('none');
  expect(await decoration('.as-site-footer-legal-links a')).toBe('none');
  expect(await decoration('.as-site-footer p a')).toBe('underline');
});

for (const scheme of ['light', 'dark']) {
  test(`nav text, brand, toggle and footer text meet 4.5:1 in ${scheme}`, async ({ page }) => {
    await open(page, { scheme, width: 1280 });
    for (const sel of ['.as-site-brand', '.as-site-nav-links a:not([aria-current])', '.as-site-nav-links a[aria-current="page"]',
      '.as-site-footer-heading', '.as-site-footer-list a', '.as-site-footer-legal p']) {
      expect(await stackedContrast(page, sel), `${sel} in ${scheme}`).toBeGreaterThanOrEqual(4.5);
    }
    await page.setViewportSize({ width: 390, height: 800 });
    await expect(toggle(page)).toBeVisible();
    expect(await stackedContrast(page, '.as-site-nav-toggle'), `toggle in ${scheme}`).toBeGreaterThanOrEqual(4.5);
  });
}

test('forced colors keep the toggle boundary and the current-page marker visible', async ({ page }) => {
  await open(page, { width: 390, forced: true });
  const boundary = await toggle(page).evaluate(el => { const s = getComputedStyle(el); return [s.borderTopStyle, s.borderTopColor]; });
  expect(boundary[0]).toBe('solid');
  expect(boundary[1]).not.toBe('rgba(0, 0, 0, 0)');
  await page.setViewportSize({ width: 1280, height: 800 });
  const marker = await page.locator('.as-site-nav-links a[aria-current="page"]').evaluate(el => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineColor]; });
  expect(marker[0]).toBe('solid');
  expect(marker[1]).not.toBe('rgba(0, 0, 0, 0)');
});
