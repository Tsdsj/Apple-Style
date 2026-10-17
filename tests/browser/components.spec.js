// Web app components: form fields, pop-up button, selectable list (listbox),
// modal dialog, toast, empty and loading states, status pills.
const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8767';

async function load(page, body, { density, scheme = 'light', media = {}, viewport = { width: 1024, height: 768 } } = {}) {
  await page.setViewportSize(viewport);
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce', ...media });
  await page.goto(base);
  await page.setContent(`<!doctype html><html ${density ? `data-density="${density}"` : ''}><head>
    <link rel="stylesheet" href="${base}/skills/Apple-Style/web/apple-style.css"></head>
    <body class="as-body"><main id="root">${body}</main><script src="${base}/skills/Apple-Style/web/liquid-glass.js"></script></body></html>`);
  await page.evaluate(() => LiquidGlass.init(document.querySelector('#root')));
}
const settle = page => page.waitForFunction(() => document.getAnimations().length === 0);

// Composites every ancestor background from white down, then the text.
const contrast = (page, selector) => page.evaluate(sel => {
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

const form = `<form class="as-form" style="inline-size:360px">
  <label class="as-form-field"><span class="as-form-label">Title</span><input class="as-input" id="title" aria-describedby="err">
    <span class="as-form-error" id="err" hidden>Enter a title.</span></label>
  <label class="as-form-field"><span class="as-form-label">Notes</span><textarea class="as-input" id="notes"></textarea><span class="as-form-hint" id="hint">Optional.</span></label>
  <label class="as-form-field"><span class="as-form-label">Owner</span><select class="as-input" id="owner"><option>Unassigned</option><option>Lin</option><option>Chen</option></select></label>
</form>`;
const fieldSizes = page => page.evaluate(() => {
  const r = id => document.getElementById(id), cs = id => getComputedStyle(r(id));
  return { input: [Math.round(r('title').getBoundingClientRect().height), cs('title').fontSize],
    select: Math.round(r('owner').getBoundingClientRect().height), label: cs('title').fontSize, hint: cs('hint').fontSize };
});

test.describe('form fields', () => {
  test('follow the density tiers, and touch keeps 44 px and 16 px text', async ({ page, browser }) => {
    await load(page, form);
    expect(await fieldSizes(page)).toMatchObject({ input: [44, '17px'], select: 44, hint: '13px' });
    await load(page, form, { density: 'desktop' });
    expect(await fieldSizes(page)).toMatchObject({ input: [32, '14px'], select: 32, hint: '12px' });
    const touch = await browser.newPage({ hasTouch: true });
    await load(touch, form, { density: 'desktop' });
    expect(await fieldSizes(touch)).toMatchObject({ input: [44, '16px'], select: 44 });
    await touch.close();
  });

  test('focus shows a ring, an invalid field a red edge, and the error text is described', async ({ page }) => {
    await load(page, form, { density: 'desktop' });
    await page.keyboard.press('Tab');
    await expect(page.locator('#title')).toBeFocused();
    expect(await page.locator('#title').evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
    const edge = () => page.locator('#title').evaluate(el => getComputedStyle(el).borderTopColor);
    const before = await edge();
    await page.evaluate(() => { title.setAttribute('aria-invalid', 'true'); err.hidden = false; });
    expect(await edge()).not.toBe(before);
    await expect(page.locator('#title')).toHaveAccessibleDescription('Enter a title.');
    expect(await contrast(page, '#err')).toBeGreaterThanOrEqual(4.5);
    expect(await contrast(page, '#hint')).toBeGreaterThanOrEqual(4.5);
  });

  test('the pop-up button uses the customizable select picker with a pointer', async ({ page }) => {
    await load(page, form, { density: 'desktop' });
    const supported = await page.evaluate(() => CSS.supports('appearance', 'base-select'));
    test.skip(!supported, 'customizable select not supported in this browser');
    expect(await page.locator('#owner').evaluate(el => getComputedStyle(el).appearance)).toBe('base-select');
    await page.locator('#owner').click();
    expect(await page.evaluate(() => owner.matches(':open'))).toBe(true);
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await expect(page.locator('#owner')).toHaveValue('Lin');
  });
});

const list = (n = 5, extra = '') => `<div class="as-listbox" id="lb" aria-label="Tickets" ${extra}>${
  ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf'].slice(0, n).map((t, i) => `<div class="as-option" id="o${i}"${i === 1 ? ' aria-selected="true"' : ''}>${t}</div>`).join('')}</div>
  <button id="after">After</button>`;
const state = page => page.evaluate(() => ({
  selected: [...document.querySelectorAll('#lb [aria-selected="true"]')].map(o => o.id),
  stops: [...document.querySelectorAll('#lb [tabindex="0"]')].map(o => o.id),
  focus: document.activeElement.id,
}));

test.describe('listbox', () => {
  test('one tab stop on the selection; arrows, Home and End move it and fire change', async ({ page }) => {
    await load(page, list());
    expect(await page.evaluate(() => [lb.getAttribute('role'), [...lb.children].map(o => o.getAttribute('role') + ':' + o.getAttribute('aria-selected'))])).toEqual(
      ['listbox', ['option:false', 'option:true', 'option:false', 'option:false', 'option:false']]);
    await page.evaluate(() => { window.changes = 0; lb.addEventListener('change', () => changes++); });
    await page.keyboard.press('Tab');
    expect(await state(page)).toEqual({ selected: ['o1'], stops: ['o1'], focus: 'o1' });
    await page.keyboard.press('ArrowDown');
    expect(await state(page)).toEqual({ selected: ['o2'], stops: ['o2'], focus: 'o2' });
    await page.keyboard.press('End');
    expect(await state(page)).toMatchObject({ selected: ['o4'], focus: 'o4' });
    await page.keyboard.press('ArrowDown');   // no wrap
    expect(await state(page)).toMatchObject({ selected: ['o4'] });
    await page.keyboard.press('Home');
    expect(await state(page)).toMatchObject({ selected: ['o0'], focus: 'o0' });
    expect(await page.evaluate(() => changes)).toBe(3);
    await page.keyboard.press('Tab');
    expect(await state(page)).toMatchObject({ focus: 'after' });
  });

  test('click selects; disabled options are skipped; type-ahead finds by name', async ({ page }) => {
    await load(page, list(7));
    await page.evaluate(() => o3.setAttribute('aria-disabled', 'true'));
    await page.click('#o2');
    expect(await state(page)).toEqual({ selected: ['o2'], stops: ['o2'], focus: 'o2' });
    await page.keyboard.press('ArrowDown');
    expect(await state(page)).toMatchObject({ selected: ['o4'] });
    await page.click('#o3', { force: true });
    expect(await state(page)).toMatchObject({ selected: ['o4'] });
    await page.keyboard.press('g');
    expect(await state(page)).toMatchObject({ selected: ['o6'], focus: 'o6' });
    await page.keyboard.type('ch');
    expect(await state(page)).toMatchObject({ selected: ['o2'] });
  });

  test('manual activation moves focus only; Space selects', async ({ page }) => {
    await load(page, list(5, 'data-activation="manual"'));
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
    expect(await state(page)).toEqual({ selected: ['o1'], stops: ['o3'], focus: 'o3' });
    await page.keyboard.press('Space');
    expect(await state(page)).toEqual({ selected: ['o3'], stops: ['o3'], focus: 'o3' });
  });

  test('re-rendered rows and selection from code keep one selection, one tab stop and focus', async ({ page }) => {
    await load(page, list());
    await page.click('#o2');
    // The page re-renders every row in its change handler, as list views do.
    await page.evaluate(() => {
      lb.addEventListener('change', () => {
        const id = lb.querySelector('[aria-selected="true"]').id;
        lb.innerHTML = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'].map((t, i) => `<div class="as-option" id="o${i}" aria-selected="${'o' + i === id}">${t}</div>`).join('');
      });
    });
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => state(page)).toEqual({ selected: ['o3'], stops: ['o3'], focus: 'o3' });
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => state(page)).toEqual({ selected: ['o4'], stops: ['o4'], focus: 'o4' });

    await page.locator('#after').focus();
    await page.evaluate(() => o0.setAttribute('aria-selected', 'true'));
    await expect.poll(() => state(page)).toEqual({ selected: ['o0'], stops: ['o0'], focus: 'after' });
    // Rows rendered later (a list that loads) get roles and a tab stop.
    await page.evaluate(() => { lb.innerHTML = ''; lb.insertAdjacentHTML('beforeend', '<div class="as-option" id="n0">New</div><div class="as-option" id="n1">Next</div>'); });
    await expect.poll(() => page.evaluate(() => [...lb.children].map(o => o.getAttribute('role') + ':' + o.tabIndex))).toEqual(['option:0', 'option:-1']);
    expect(await page.evaluate(() => document.activeElement.id)).toBe('after');
  });

  test('horizontal orientation uses Left/Right and mirrors in RTL', async ({ page }) => {
    await load(page, list(3, 'aria-orientation="horizontal"'));
    await page.click('#o0');
    await page.keyboard.press('ArrowRight');
    expect(await state(page)).toMatchObject({ selected: ['o1'] });
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    await page.keyboard.press('ArrowLeft');
    expect(await state(page)).toMatchObject({ selected: ['o2'] });
  });

  test('selected rows: white text and pills keep 4.5:1, and the focus ring shows outside the fill', async ({ page }) => {
    for (const scheme of ['light', 'dark']) {
      await load(page, `<div class="as-listbox" id="lb" aria-label="T"><div class="as-option" id="s" aria-selected="true">Row <span class="as-secondary" id="sec">meta</span>
        <span class="as-pill as-pill-info" id="p">Open</span></div><div class="as-option">Other</div></div>`, { scheme, density: 'desktop' });
      for (const sel of ['#s', '#sec', '#p']) expect(await contrast(page, sel), `${sel} in ${scheme}`).toBeGreaterThanOrEqual(4.5);
      await page.keyboard.press('Tab');
      expect(await page.locator('#s').evaluate(el => { const s = getComputedStyle(el); return [s.outlineStyle, parseFloat(s.outlineOffset) > 0]; })).toEqual(['solid', true]);
    }
  });

  test('listbox() is idempotent and destroy() releases it', async ({ page }) => {
    await load(page, list());
    await page.evaluate(() => { LiquidGlass.listbox(lb); LiquidGlass.controls(document); window.changes = 0; lb.addEventListener('change', () => changes++); });
    await page.click('#o3');
    expect(await page.evaluate(() => changes)).toBe(1);
    await page.evaluate(() => LiquidGlass.destroy(document));
    await page.click('#o0');
    expect(await page.evaluate(() => [changes, o0.getAttribute('aria-selected')])).toEqual([1, 'false']);
  });
});

const dialog = `<button id="open" class="as-button">New</button>
  <dialog class="as-dialog" id="dlg" aria-labelledby="dt"><form method="dialog">
    <header class="as-dialog-header"><h2 class="as-dialog-title" id="dt">New ticket</h2></header>
    <div class="as-dialog-body as-form"><label class="as-form-field"><span class="as-form-label">Title</span><input class="as-input" id="dtitle"></label></div>
    <footer class="as-dialog-footer"><button class="as-button" value="cancel" id="cancel">Cancel</button><button class="as-button as-button-filled" id="create">Create</button></footer>
  </form></dialog>
  <p id="behind" style="font:700 40px/1 sans-serif">BEHIND THE DIALOG</p>`;

test.describe('dialog', () => {
  test('is an opaque modal: focus moves in, Escape closes and focus returns', async ({ page }) => {
    await load(page, dialog, { density: 'desktop' });
    await page.click('#open');
    await page.evaluate(() => dlg.showModal());
    await expect(page.locator('#dtitle')).toBeFocused();
    expect(await page.evaluate(() => { const s = getComputedStyle(dlg); return [s.backgroundColor, s.borderTopLeftRadius, s.paddingTop]; })).toEqual(['rgb(255, 255, 255)', '20px', '0px']);
    await settle(page);
    expect(await page.evaluate(() => { const s = getComputedStyle(dlg); return [s.opacity, s.translate, s.scale]; })).toEqual(['1', 'none', 'none']);
    await page.keyboard.press('Escape');
    await expect(page.locator('#dlg')).toHaveJSProperty('open', false);
    await expect(page.locator('#open')).toBeFocused();
  });

  test('footer actions sit at the trailing end, primary last, and stay visible over a long body', async ({ page }) => {
    await load(page, dialog.replace('<div class="as-dialog-body as-form">', '<div class="as-dialog-body as-form" style="block-size:1400px">'), { density: 'desktop', viewport: { width: 1024, height: 600 } });
    await page.evaluate(() => dlg.showModal());
    await settle(page);
    const geo = await page.evaluate(() => {
      const d = dlg.getBoundingClientRect(), c = cancel.getBoundingClientRect(), p = create.getBoundingClientRect();
      return { insideViewport: d.bottom <= innerHeight, footerVisible: p.bottom <= d.bottom + 0.5, primaryLast: p.left > c.left, trailing: Math.round(d.right - p.right) };
    });
    expect(geo).toMatchObject({ insideViewport: true, footerVisible: true, primaryLast: true });
    expect(geo.trailing).toBeLessThanOrEqual(20);
  });
});

test.describe('toast', () => {
  test('announces through role="status", hides after its duration and cleans up', async ({ page }) => {
    await load(page, '<p>Page</p>');
    await page.evaluate(() => LiquidGlass.toast('Saved', { duration: 300 }));
    const t = page.locator('body > .as-toast');
    await expect(t).toHaveAttribute('role', 'status');
    await expect(t).toHaveText('Saved');
    await expect(t).toHaveClass(/is-on/);
    expect(await t.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    await expect(t).not.toHaveClass(/is-on/);
    await expect(t).toHaveText('');
    // A repeated message still changes the region so it is announced again.
    await page.evaluate(() => LiquidGlass.toast('Saved'));
    await expect(t).toHaveClass(/is-on/);
    const first = await t.evaluate(el => el.textContent);
    await page.evaluate(() => LiquidGlass.toast('Saved'));
    expect(await t.evaluate(el => el.textContent)).not.toBe(first);
    expect(await t.evaluate(el => el.textContent.replace(/\u200b/g, ''))).toBe('Saved');
    // hide() from an earlier message leaves the newer one alone
    await page.evaluate(() => { const hideFirst = LiquidGlass.toast('First'); LiquidGlass.toast('Second'); hideFirst(); });
    await expect(t).toHaveText('Second');
    await expect(t).toHaveClass(/is-on/);
    await page.evaluate(() => LiquidGlass.destroy(document));
    await expect(page.locator('.as-toast')).toHaveCount(0);
  });

  test('goes into the open modal dialog, above it and inside the viewport', async ({ page }) => {
    await load(page, dialog);
    await page.evaluate(() => { dlg.showModal(); LiquidGlass.toast('Copied'); });
    const t = page.locator('#dlg > .as-toast');
    await expect(t).toHaveText('Copied');
    await settle(page);
    const where = await t.evaluate(el => { const r = el.getBoundingClientRect();
      return { inViewport: r.bottom <= innerHeight && r.top >= 0, bottomGap: Math.round(innerHeight - r.bottom) }; });
    expect(where.inViewport).toBe(true);
    expect(where.bottomGap).toBe(24);
    const shot = await t.screenshot();
    expect(shot.length).toBeGreaterThan(500);
  });

  test('sits above a floating tab bar instead of on it', async ({ page }) => {
    await load(page, `<nav class="as-tabbar" aria-label="Sections"><div class="as-glass as-glass-group"><a class="as-tab is-selected" href="#">Home</a><a class="as-tab" href="#">Library</a></div></nav>`, { viewport: { width: 390, height: 800 } });
    await page.evaluate(() => LiquidGlass.toast('Saved'));
    await expect(page.locator('body > .as-toast')).toHaveClass(/is-on/);
    await settle(page);
    const [toast, bar] = await page.evaluate(() => [document.querySelector('.as-toast'), document.querySelector('.as-tabbar .as-glass-group')].map(el => el.getBoundingClientRect().toJSON()));
    expect(toast.bottom).toBeLessThanOrEqual(bar.top - 8);
  });

  test('a toast owned by markup is reused and kept', async ({ page }) => {
    await load(page, '<div class="as-toast" id="mine"></div>');
    await page.evaluate(() => { document.body.appendChild(mine); LiquidGlass.toast('Hello'); });
    await expect(page.locator('#mine')).toHaveText('Hello');
    expect(await page.locator('.as-toast').count()).toBe(1);
    await page.evaluate(() => LiquidGlass.destroy(document));
    await expect(page.locator('#mine')).toHaveCount(1);
    await expect(page.locator('#mine')).toHaveText('');
  });
});

test.describe('states and pills', () => {
  test('empty state hides with [hidden]; skeleton stops pulsing with reduced motion', async ({ page }) => {
    await load(page, `<div class="as-empty" id="empty" hidden><p class="as-empty-title">No tickets</p><p>Try another search.</p></div>
      <div aria-busy="true"><span class="as-skeleton" id="sk" aria-hidden="true" style="--as-skeleton-h:56px"></span></div>`, { media: { reducedMotion: 'no-preference' } });
    await expect(page.locator('#empty')).toBeHidden();
    await page.evaluate(() => { empty.hidden = false; });
    await expect(page.locator('#empty')).toBeVisible();
    expect(await page.locator('#sk').evaluate(el => [Math.round(el.getBoundingClientRect().height), getComputedStyle(el).animationName])).toEqual([56, 'as-skeleton-pulse']);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.locator('#sk').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  });

  for (const scheme of ['light', 'dark']) {
    test(`every pill variant meets 4.5:1 on the standard backgrounds in ${scheme}`, async ({ page }) => {
      const backgrounds = ['--as-bg', '--as-bg-secondary', '--as-bg-grouped-2', '--as-bg-tertiary', '--as-modal-bg'];
      const variants = ['', 'as-pill-info', 'as-pill-success', 'as-pill-warning', 'as-pill-critical'];
      await load(page, backgrounds.map((bg, i) => `<div style="background:var(${bg});padding:8px">${variants.map((v, j) => `<span class="as-pill as-pill-dot ${v}" id="p${i}-${j}">Status</span>`).join(' ')}</div>`).join(''), { scheme });
      for (let i = 0; i < backgrounds.length; i++) for (let j = 0; j < variants.length; j++) {
        expect(await contrast(page, `#p${i}-${j}`), `${variants[j] || 'neutral'} on ${backgrounds[i]}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  test('forced colors: selected option, pills, skeleton and fields stay visible', async ({ page }) => {
    await load(page, `${list(3)}<span class="as-pill as-pill-info" id="pill">Open</span><span class="as-skeleton" id="sk" style="inline-size:120px;--as-skeleton-h:20px"></span>
      <input class="as-input" id="field" aria-label="Field" style="inline-size:200px">`, { media: { forcedColors: 'active' } });
    const s = await page.evaluate(() => {
      const cs = id => getComputedStyle(document.getElementById(id));
      return { selected: cs('o1').backgroundColor, other: cs('o0').backgroundColor, pillBorder: cs('pill').borderTopStyle + ' ' + cs('pill').borderTopColor,
        skeleton: cs('sk').backgroundColor, field: cs('field').borderTopColor, canvas: getComputedStyle(document.body).backgroundColor };
    });
    expect(s.selected).not.toBe(s.other);
    expect(s.skeleton).not.toBe(s.canvas);
    expect(s.pillBorder).toMatch(/^solid rgb/);
    expect(s.pillBorder).not.toMatch(/rgba\(0, 0, 0, 0\)/);
    expect(s.field).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test('runtime without a DOM exposes inert listbox() and toast()', async () => {
  const { execFileSync } = require('child_process');
  const out = execFileSync(process.execPath, ['--input-type=module', '-e',
    "import { listbox, toast } from './skills/Apple-Style/web/liquid-glass.mjs'; listbox(null); const hide = toast('x'); hide(); console.log(typeof hide)"], { cwd: require('path').resolve(__dirname, '../..') }).toString().trim();
  expect(out).toBe('function');
});
