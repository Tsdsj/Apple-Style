// Regression tests for the defects recorded in docs/audit/2026-10-16-practicality-audit.md §2.1–2.7.
const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8767';
const web = path.resolve(__dirname, '../../skills/Apple-Style/web');
const css = `<link rel="stylesheet" href="${base}/skills/Apple-Style/web/apple-style.css">`;
const js = `<script src="${base}/skills/Apple-Style/web/liquid-glass.js"></script>`;

async function load(page, body, { dir = 'ltr', head = css } = {}) {
  await page.goto(base);
  await page.setContent(`<!doctype html><html dir="${dir}"><head>${head}</head><body class="as-body">${body}${js}</body></html>`);
}

// Decodes an element screenshot in the page and counts pixels that differ from
// the top-left corner (outside rounded controls, so the page background).
async function pixels(page, locator) {
  const png = await locator.screenshot({ animations: 'disabled' });
  return page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data, n = d.length / 4;
    let distinct = 0, dark = 0, r = 0, g = 0, b = 0, blueX = 0, blue = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - d[0]) + Math.abs(d[i + 1] - d[1]) + Math.abs(d[i + 2] - d[2]) > 96) distinct++;
      if (d[i] + d[i + 1] + d[i + 2] < 300) dark++;
      if (d[i + 2] > d[i] + 80) { blue++; blueX += (i / 4) % c.width; }
      r += d[i]; g += d[i + 1]; b += d[i + 2];
    }
    return { distinct, dark, mean: [r / n, g / n, b / n], blueCenter: blue ? blueX / blue / c.width : null };
  }, png.toString('base64'));
}
const distance = (a, b) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0);

test.describe('forced colors keep control state visible (§2.1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await load(page, `<main id="root" style="padding:20px;display:grid;gap:16px;justify-items:start">
      <button id="off" class="as-toggle" role="switch" aria-checked="false" aria-label="Off"><span class="as-knob"></span></button>
      <button id="on" class="as-toggle" role="switch" aria-checked="true" aria-label="On"><span class="as-knob"></span></button>
      <div class="as-segmented" role="radiogroup" aria-label="View"><button class="as-segment is-selected">One</button><button class="as-segment">Two</button></div>
      <div style="width:240px"><input class="as-slider" type="range" min="0" max="100" value="40" aria-label="Volume"></div>
      <nav class="as-glass as-glass-group" style="position:static"><button class="as-item is-selected">Home</button><button class="as-item">Library</button></nav></main>`);
    await page.evaluate(() => LiquidGlass.init(document.querySelector('#root')));
  });
  test('switches draw a boundary and a knob, and on differs from off', async ({ page }) => {
    const off = await pixels(page, page.locator('#off')), on = await pixels(page, page.locator('#on'));
    expect(off.distinct, 'off switch is drawn').toBeGreaterThan(150);
    expect(on.distinct, 'on switch is drawn').toBeGreaterThan(150);
    expect(distance(off.mean, on.mean), 'on and off are distinguishable').toBeGreaterThan(30);
  });
  test('the selected segment and the selected group item are marked', async ({ page }) => {
    const segs = page.locator('.as-segment');
    expect(distance((await pixels(page, segs.nth(0))).mean, (await pixels(page, segs.nth(1))).mean)).toBeGreaterThan(60);
    const items = page.locator('.as-item');
    expect(distance((await pixels(page, items.nth(0))).mean, (await pixels(page, items.nth(1))).mean)).toBeGreaterThan(60);
  });
  test('the slider track and thumb stay visible', async ({ page }) => {
    await expect(page.locator('.as-slider-knob')).toBeHidden();
    expect((await pixels(page, page.locator('.as-slider'))).distinct).toBeGreaterThan(300);
  });
});

test.describe('menu shortcuts leave text editing to the focused field (§2.2)', () => {
  const menu = `<div class="as-menubar" role="menubar" data-shortcuts><button class="as-menubar-item">Edit</button></div>
    <div class="as-menu" role="menu">
      <button class="as-menu-item" role="menuitem" data-cmd="selectAllRows">Select All Rows<span class="as-shortcut">⌘A</span></button>
      <button class="as-menu-item" role="menuitem" data-cmd="undoApprove">Undo Approve<span class="as-shortcut">⌘Z</span></button>
      <button class="as-menu-item" role="menuitem" data-cmd="bold">Bold Label<span class="as-shortcut">⌘B</span></button>
      <button class="as-menu-item" role="menuitem" data-cmd="save">Save<span class="as-shortcut">⌘S</span></button></div>
    <input id="text" value="hello"><textarea id="area">notes</textarea><div id="rich" contenteditable="true">rich</div>
    <input id="box" type="checkbox" aria-label="Row">`;
  async function setup(page, platform) {
    await page.addInitScript(p => {
      Object.defineProperty(Navigator.prototype, 'platform', { get: () => p.platform, configurable: true });
      Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => ({ platform: p.ua }), configurable: true });
    }, platform);
    await load(page, menu);
    const bound = await page.evaluate(() => {
      window.hits = []; window.prevented = [];
      document.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => hits.push(b.dataset.cmd)));
      const { shortcuts } = LiquidGlass.init();
      addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !['Control', 'Meta'].includes(e.key)) prevented.push(e.defaultPrevented); });
      return shortcuts;
    });
    expect(bound).toBe(4);
  }
  const take = page => page.evaluate(() => { const r = { hits: [...hits], prevented: [...prevented] }; hits.length = 0; prevented.length = 0; return r; });

  test('non-Apple platform: ⌘ maps to Ctrl, editing keys stay with fields', async ({ page }) => {
    await setup(page, { platform: 'Win32', ua: 'Windows' });
    for (const field of ['#text', '#area']) {
      await page.locator(field).focus();
      for (const key of ['Control+a', 'Control+z']) {
        await page.keyboard.press(key);
        expect(await take(page), `${key} in ${field}`).toEqual({ hits: [], prevented: [false] });
      }
      await page.keyboard.press('Control+s');
      expect(await take(page), `Control+s in ${field}`).toEqual({ hits: ['save'], prevented: [true] });
    }
    await page.locator('#text').focus(); await page.keyboard.press('Control+b');
    expect((await take(page)).hits, 'bold is not an editing key in a plain field').toEqual(['bold']);
    await page.locator('#rich').focus(); await page.keyboard.press('Control+b');
    expect(await take(page), 'rich text owns bold').toEqual({ hits: [], prevented: [false] });
    await page.locator('#box').focus(); await page.keyboard.press('Control+a');
    expect((await take(page)).hits, 'a checkbox is not a text field').toEqual(['selectAllRows']);
    await page.keyboard.press('Meta+s');
    expect((await take(page)).hits, 'the Windows key is not Ctrl').toEqual([]);
  });

  test('Apple platform: ⌘ is Command only', async ({ page }) => {
    await setup(page, { platform: 'MacIntel', ua: 'macOS' });
    await page.locator('#box').focus();
    await page.keyboard.press('Meta+s'); expect((await take(page)).hits).toEqual(['save']);
    await page.keyboard.press('Control+s'); expect((await take(page)).hits, 'Ctrl is not Command on a Mac').toEqual([]);
    await page.locator('#text').focus(); await page.keyboard.press('Meta+a');
    expect(await take(page)).toEqual({ hits: [], prevented: [false] });
  });
});

test.describe('right-to-left layout (§2.3)', () => {
  test('the slider knob is drawn where the native thumb is, and the fill starts on the right', async ({ page }) => {
    await load(page, `<div style="width:300px;padding:20px"><input class="as-slider" type="range" min="0" max="100" value="10" aria-label="Volume"></div>`, { dir: 'rtl' });
    await page.evaluate(() => LiquidGlass.init());
    const slider = page.locator('.as-slider'), knob = page.locator('.as-slider-knob');
    await expect.poll(async () => {
      const [s, k] = [await slider.boundingBox(), await knob.boundingBox()];
      const expected = s.x + s.width - (14 + 0.1 * (s.width - 28));
      return Math.abs(k.x + k.width / 2 - expected);
    }).toBeLessThan(2);
    const k = await knob.boundingBox();
    await page.mouse.click(k.x + k.width / 2, k.y + k.height / 2);
    expect(Math.abs(Number(await slider.inputValue()) - 10)).toBeLessThanOrEqual(3);
    expect((await pixels(page, slider)).blueCenter, 'filled track is on the right').toBeGreaterThan(0.75);
  });

  test('the switch is mirrored and its drag commits toward the inline start', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await load(page, `<main id="root" style="padding:30px;display:flex;gap:30px">
      <button id="a" class="as-toggle" role="switch" aria-checked="false" aria-label="A"><span class="as-knob"></span></button>
      <button id="b" class="as-toggle" role="switch" aria-checked="true" aria-label="B"><span class="as-knob"></span></button></main>`, { dir: 'rtl' });
    await page.evaluate(() => { LiquidGlass.init(document.querySelector('#root')); window.changes = 0; a.addEventListener('change', () => changes++); });
    const side = id => page.evaluate(id => { const t = document.getElementById(id).getBoundingClientRect(), k = document.querySelector('#' + id + ' .as-knob').getBoundingClientRect();
      return k.left + k.width / 2 < t.left + t.width / 2 ? 'left' : 'right'; }, id);
    await expect.poll(() => side('a')).toBe('right');
    await expect.poll(() => side('b')).toBe('left');
    const t = await page.locator('#a').boundingBox();
    await page.mouse.move(t.x + t.width - 8, t.y + t.height / 2); await page.mouse.down();
    await page.mouse.move(t.x + t.width - 24, t.y + t.height / 2, { steps: 4 });
    await page.mouse.move(t.x + 6, t.y + t.height / 2, { steps: 4 }); await page.mouse.up();
    await expect(page.locator('#a')).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => changes)).toBe(1);
  });

  test('trailing values, badges, alerts, sheet titles and menu origins follow the writing direction', async ({ page }) => {
    await load(page, `<ul class="as-list" style="width:300px"><li>Wi-Fi<span class="as-value">On</span></li></ul>
      <div style="position:relative;width:60px;height:40px;margin:30px"><span class="as-badge" id="badge">3</span></div>
      <div class="as-glass as-alert" id="dialog"><h2>عنوان</h2><p>نص</p></div>
      <div class="as-glass as-glass-large as-sheet is-open" id="sheet"><h2 class="as-sheet-title">عنوان</h2></div>
      <div class="as-glass as-glass-large as-menu" id="menu"></div>`, { dir: 'rtl' });
    const r = await page.evaluate(() => {
      const li = document.querySelector('.as-list li').getBoundingClientRect(), v = document.querySelector('.as-value').getBoundingClientRect();
      const $ = id => document.getElementById(id), badge = $('badge'), m = getComputedStyle($('menu'));
      const host = badge.parentElement.getBoundingClientRect(), b = badge.getBoundingClientRect();
      return { valueAtEnd: v.left - li.left < li.right - v.right, badgeOverhangsLeft: b.left < host.left,
        alert: getComputedStyle($('dialog')).textAlign, title: getComputedStyle(document.querySelector('.as-sheet-title')).textAlign,
        originRight: parseFloat(m.transformOrigin) > parseFloat(m.width) / 2 };
    });
    expect(r).toEqual({ valueAtEnd: true, badgeOverhangsLeft: true, alert: 'start', title: 'start', originRight: true });
  });
});

for (const colorScheme of ['light', 'dark']) {
  test(`vibrant labels stay visible in ${colorScheme} appearance (§2.4)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await load(page, `<div class="as-material" style="padding:20px;background:var(--as-bg-secondary)">
      <p id="plain" style="font-size:40px;margin:0">Vibrant</p><p id="vibrant" class="as-vibrant" style="font-size:40px;margin:0">Vibrant</p></div>`);
    const plain = await pixels(page, page.locator('#plain')), vibrant = await pixels(page, page.locator('#vibrant'));
    expect(plain.distinct).toBeGreaterThan(200);
    expect(vibrant.distinct / plain.distinct).toBeGreaterThan(0.8);
  });
}

test('a search field fits a narrow container whatever the font metrics (§2.5)', async ({ page }) => {
  await load(page, `<div id="box" style="width:200px"><label class="as-glass as-search">
    <input type="search" placeholder="Search" aria-label="Search" style="font-size:40px"></label></div>`);
  const { box, input } = await page.evaluate(() => ({ box: document.getElementById('box').getBoundingClientRect().right,
    input: document.querySelector('.as-search input').getBoundingClientRect().right }));
  expect(input).toBeLessThanOrEqual(box + 0.5);
});

test.describe('module loading (§2.6)', () => {
  test('Node can require and import the runtime without a DOM', async () => {
    const file = path.join(web, 'liquid-glass.js');
    const runtime = require(file);
    try {
      expect(typeof runtime.init).toBe('function');
      const status = runtime.init();
      expect(status).toMatchObject({ attached: 0, controls: 0, shortcuts: 0, lens: false });
      expect(() => status.destroy()).not.toThrow();
      await expect(runtime.morph()).resolves.toBeUndefined();
      const esm = await import(pathToFileURL(path.join(web, 'liquid-glass.mjs')).href);
      expect(esm.default).toBe(runtime);
      for (const name of ['init', 'destroy', 'attach', 'detach', 'refresh', 'controls', 'morph', 'materialize']) expect(typeof esm[name], name).toBe('function');
      expect(esm.supportsLens).toBe(false);
    } finally { delete globalThis.LiquidGlass; }
  });

  test('the classic script and the ES module entry share one runtime', async ({ page }) => {
    await page.goto(base);
    await page.setContent(`<!doctype html><html><head>${css}</head><body><main id="root">
      <button class="as-toggle" role="switch" aria-checked="false" aria-label="Wi-Fi"><span class="as-knob"></span></button></main>
      <script src="${base}/skills/Apple-Style/web/liquid-glass.js" data-auto></script>
      <script>window.classic = window.LiquidGlass;</script>
      <script type="module">
        import LiquidGlass, { init } from '${base}/skills/Apple-Style/web/liquid-glass.mjs';
        window.changes = 0; document.querySelector('.as-toggle').addEventListener('change', () => changes++);
        init(document.querySelector('#root'));
        window.esm = { module: LiquidGlass === window.classic, global: window.LiquidGlass === window.classic };
      </script></body></html>`);
    await expect.poll(() => page.evaluate(() => window.esm)).toEqual({ module: true, global: true });
    await page.locator('.as-toggle').click();
    await expect(page.locator('.as-toggle')).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => changes)).toBe(1);
  });
});

test('imported into a cascade layer, the stylesheet yields to utilities and still beats resets (§2.7)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });   // no background transition while the import applies
  await load(page, `<main id="root"><button id="plain" class="as-button as-button-filled">Save</button>
    <button id="util" class="as-button as-button-filled px-2 bg-red">Save</button>
    <button class="as-toggle" role="switch" aria-checked="false" aria-label="Wi-Fi"><span class="as-knob"></span></button></main>`, {
    head: `<style>
      @layer base, apple-style, utilities;
      @import url("${base}/skills/Apple-Style/web/apple-style.css") layer(apple-style);
      @layer base { button { padding: 0; border: 0; background: transparent; font: inherit; } }
      @layer utilities { .px-2 { padding-inline: 8px; } .bg-red { background-color: rgb(255, 0, 0); } }
    </style>` });
  await page.evaluate(() => LiquidGlass.init(document.querySelector('#root')));
  const style = id => page.evaluate(id => { const c = getComputedStyle(document.getElementById(id)); return [c.paddingLeft, c.backgroundColor]; }, id);
  await expect.poll(() => style('plain')).toEqual(['20px', 'rgb(0, 102, 204)']);
  await expect.poll(() => style('util')).toEqual(['8px', 'rgb(255, 0, 0)']);
  await page.locator('.as-toggle').click();
  await expect(page.locator('.as-toggle')).toHaveAttribute('aria-checked', 'true');
});
