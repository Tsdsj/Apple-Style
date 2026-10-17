// Evidence for evals/runs/2026-10-17-pc-web/report.md. Not part of CI:
//   AXE=/path/to/axe.min.js npx playwright test -c evals/runs/2026-10-17-pc-web/playwright.config.js
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const url = 'http://127.0.0.1:8767/evals/runs/2026-10-17-pc-web/index.html';
const out = path.join(__dirname, 'evidence');
fs.mkdirSync(out, { recursive: true });
const record = (name, data) => fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(data, null, 2) + '\n');

async function open(page, { width = 1440, height = 900, scheme = 'light', media = {} } = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ colorScheme: scheme, ...media });
  await page.goto(url);
  await page.waitForSelector('#list:not([hidden])');
  return errors;
}
async function axe(page) {
  await page.addScriptTag({ path: process.env.AXE });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] });
    const pick = list => list.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, targets: v.nodes.slice(0, 4).map(n => n.target.join(' ')) }));
    return { violations: pick(r.violations), incomplete: pick(r.incomplete) };
  });
}

test('layout at desktop widths and at 200% zoom', async ({ page }) => {
  const results = [];
  for (const width of [1024, 1280, 1440, 1920, 720]) {
    const errors = await open(page, { width });
    const m = await page.evaluate(() => {
      const w = el => Math.round(document.querySelector(el).getBoundingClientRect().width);
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sidebar: w('.as-sidebar'), content: w('.as-content'), inspector: w('.as-inspector'),
        titleTruncated: [...document.querySelectorAll('.ticket .title')].filter(t => t.scrollWidth > t.clientWidth).length };
    });
    results.push({ width, ...m, errors });
    if (width === 1024 || width === 720) await page.screenshot({ path: path.join(out, `layout-${width}.png`) });   // 1440 = page-light.png
    expect(m.overflow, `horizontal overflow at ${width}`).toBeLessThanOrEqual(0);
    expect(errors, `console at ${width}`).toEqual([]);
  }
  record('layout', results);
});

test('axe: light, dark and with the dialog open', async ({ page }) => {
  const results = {};
  for (const scheme of ['light', 'dark']) {
    await open(page, { scheme });
    results[scheme] = await axe(page);
    await page.screenshot({ path: path.join(out, `page-${scheme}.png`) });
  }
  await open(page);
  await page.click('#new');
  await page.waitForFunction(() => document.getAnimations().length === 0);   // measure the open dialog, not its fade-in
  results.dialog = await axe(page);
  await page.screenshot({ path: path.join(out, 'dialog-light.png') });
  record('axe', results);
});

test('keyboard: list, filters, dialog, validation and focus return', async ({ page }) => {
  const steps = [];
  const note = (name, value) => steps.push({ name, value });
  await open(page);
  const stops = [];
  await page.locator('body').focus();
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate(() => { const a = document.activeElement; return (a.getAttribute('aria-label') || a.textContent.trim().slice(0, 12) || a.tagName) + ' [' + (a.getAttribute('role') || a.tagName.toLowerCase()) + ']'; }));
  }
  note('tab order', stops);

  await page.locator('.ticket[aria-selected="true"]').focus();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  const third = await page.evaluate(() => ({ focused: document.activeElement.id, selected: document.querySelector('.ticket[aria-selected="true"]').id, inspector: document.querySelector('.detail-title').textContent }));
  note('listbox ArrowDown ×2', third);
  expect(third.focused).toBe(third.selected);

  await page.locator('#status .is-selected').focus();
  await page.keyboard.press('ArrowRight');
  note('status ArrowRight', await page.evaluate(() => ({ checked: document.querySelector('#status [aria-checked="true"]').textContent, rows: document.querySelectorAll('.ticket').length })));

  await page.locator('#new').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#create')).toHaveJSProperty('open', true);
  note('dialog opens with focus in', await page.evaluate(() => document.activeElement.id));
  // A modal <dialog> makes the page inert; Tab cycles through the dialog and
  // may pass through the browser's own UI (activeElement = body) — it must
  // never land on page content behind the dialog.
  const landed = [];
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); landed.push(await page.evaluate(() => { const a = document.activeElement; return a.closest('#create') ? 'dialog:' + (a.name || a.id || a.textContent.trim()) : a === document.body ? 'browser-ui' : 'PAGE:' + a.outerHTML.slice(0, 60); })); }
  note('Tab inside the modal', landed);
  expect(landed.filter(x => x.startsWith('PAGE:'))).toEqual([]);

  await page.locator('#createForm [type=submit]').click();
  note('empty submit', await page.evaluate(() => ({ invalid: title.getAttribute('aria-invalid'), errorShown: !titleError.hidden, focus: document.activeElement.id })));

  await page.keyboard.press('Escape');
  await expect(page.locator('#create')).toHaveJSProperty('open', false);
  note('Escape returns focus to', await page.evaluate(() => document.activeElement.id));

  await page.click('#new'); await page.fill('#title', '键盘新建的工单');
  await page.locator('#prio .as-segment').nth(2).click();
  await page.locator('#urgent').focus(); await page.keyboard.press('Space');
  await page.keyboard.press('Control+Enter');   // not bound: must not submit or break typing
  await page.locator('#createForm [type=submit]').click();
  await expect(page.locator('.as-toast')).toHaveText(/已创建/);
  note('created', await page.evaluate(() => ({ toast: document.querySelector('.as-toast').textContent, selected: document.querySelector('.ticket[aria-selected="true"] .title').textContent, focus: document.activeElement.id })));
  record('keyboard', steps);
});

test('forced colors and reduced motion', async ({ page }) => {
  await open(page, { media: { forcedColors: 'active', reducedMotion: 'reduce' } });
  await page.screenshot({ path: path.join(out, 'forced-colors.png') });
  const state = await page.evaluate(() => {
    const s = el => getComputedStyle(document.querySelector(el));
    return { selectedRow: s('.ticket[aria-selected="true"]').backgroundColor, otherRow: s('.ticket[aria-selected="false"]').backgroundColor,
      sidebarSelected: s('.as-sidebar .as-row.is-selected').backgroundColor, toggleOn: s('#notify').backgroundColor,
      longAnimations: document.getAnimations().filter(a => (a.effect.getTiming().duration || 0) > 10).length };
  });
  record('forced-colors', state);
});
