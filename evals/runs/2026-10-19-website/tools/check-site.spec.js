// Same checks for every generated site (evals/runs/2026-10-19-website/report.md). Not part of CI.
//   SITE=evals/runs/2026-10-19-website/sites/A PORT=9211 OUT=/tmp/eval-A AXE=/path/to/axe.min.js \
//   CHROMIUM=/opt/pw-browsers/chromium npx playwright test -c evals/runs/2026-10-19-website/tools/website.config.js
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const SITE = process.env.SITE, PORT = process.env.PORT, OUT = process.env.OUT, AXE = process.env.AXE;
const base = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(OUT, { recursive: true });
const record = (name, data) => fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(data, null, 2) + '\n');
const shot = (page, name, opts = {}) => page.screenshot({ path: path.join(OUT, name + '.png'), ...opts });

function watch(page) {
  const log = { errors: [], external: [], failed: [] };
  page.on('pageerror', e => log.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') log.errors.push('console: ' + m.text()); });
  page.on('request', r => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !u.protocol.startsWith('data')) log.external.push(r.url()); });
  page.on('requestfailed', r => log.failed.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) log.failed.push(r.status() + ' ' + r.url()); });
  return log;
}

// Crawl internal links from the home page; every HTML page is checked below.
async function crawl(page) {
  const seen = new Map(), queue = ['/index.html'], broken = [], anchors = [];
  while (queue.length) {
    const p = queue.shift();
    if (seen.has(p)) continue;
    const res = await page.goto(base + p);
    const status = res ? res.status() : 0;
    seen.set(p, status);
    if (status !== 200 || !(res.headers()['content-type'] || '').includes('html')) { if (status !== 200) broken.push(p + ' ' + status); continue; }
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
    for (const href of links) {
      if (/^(mailto:|tel:|javascript:)/.test(href)) continue;
      const u = new URL(href, page.url());
      if (u.origin !== base) continue;
      let pth = u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname;
      if (u.hash && u.hash.length > 1) anchors.push({ from: p, to: pth, id: decodeURIComponent(u.hash.slice(1)) });
      if (!seen.has(pth) && !queue.includes(pth)) {
        if (/\.html?$/.test(pth) || !path.extname(pth)) queue.push(pth);
        else { const r = await page.request.get(base + pth); if (r.status() !== 200) broken.push(`${pth} ${r.status()} (from ${p})`); seen.set(pth, r.status()); }
      }
    }
  }
  const missingAnchors = [];
  for (const a of anchors) {
    if (seen.get(a.to) !== 200) continue;
    await page.goto(base + a.to);
    if (!(await page.evaluate(id => !!document.getElementById(id) || !!document.getElementsByName(id).length, a.id))) missingAnchors.push(`${a.from} → ${a.to}#${a.id}`);
  }
  const pages = [...seen].filter(([p, s]) => s === 200 && (/\.html?$/.test(p))).map(([p]) => p);
  return { pages, broken, missingAnchors };
}

let site;
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  site = await crawl(page);
  const files = [];
  (function walk(dir) { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walk(p); else files.push(path.relative(SITE, p)); } })(SITE);
  site.files = files;
  site.orphans = files.filter(f => /\.html?$/.test(f) && !site.pages.includes('/' + f));
  record('crawl', site);
  await page.close();
});

test('pages: metadata, structure, console, external requests', async ({ page }) => {
  test.setTimeout(240000);
  const out = [];
  for (const p of [...site.pages, ...site.orphans.map(f => '/' + f)]) {
    const log = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + p, { waitUntil: 'networkidle' });
    const info = await page.evaluate(() => {
      const q = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
      const heads = all('h1,h2,h3,h4,h5,h6').filter(h => h.getClientRects().length).map(h => +h.tagName[1]);
      const skips = heads.filter((l, i) => i && l > heads[i - 1] + 1).length;
      const focusables = all('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').filter(e => e.getClientRects().length && !e.disabled);
      const first = focusables[0];
      return {
        title: document.title, lang: document.documentElement.lang,
        description: q('meta[name="description"]')?.content || null,
        viewport: q('meta[name="viewport"]')?.content || null,
        icon: !!q('link[rel~="icon"]'), appleTouch: !!q('link[rel="apple-touch-icon"]'),
        og: all('meta[property^="og:"]').map(m => m.getAttribute('property')),
        canonical: q('link[rel="canonical"]')?.href || null, themeColor: all('meta[name="theme-color"]').length,
        colorScheme: q('meta[name="color-scheme"]')?.content || null,
        h1: all('h1').filter(h => h.getClientRects().length).length, headingSkips: skips,
        main: all('main,[role="main"]').length, header: all('header,[role="banner"]').length, footer: all('footer,[role="contentinfo"]').length,
        navs: all('nav').map(n => n.getAttribute('aria-label') || n.getAttribute('aria-labelledby') || ''),
        ariaCurrent: all('nav [aria-current]').length,
        skipLink: !!first && first.tagName === 'A' && /^#/.test(first.getAttribute('href') || '') ,
        imgNoAlt: all('img:not([alt])').length, imgs: all('img').length, svgs: all('svg').length,
        lazy: all('img[loading="lazy"]').length,
        asClasses: [...new Set(all('[class]').flatMap(e => [...e.classList]).filter(c => c.startsWith('as-')))].length,
        stylesheets: all('link[rel="stylesheet"]').map(l => l.getAttribute('href')),
        scripts: all('script[src]').map(s => s.getAttribute('src')),
        inlineStyleBytes: all('style').reduce((n, s) => n + s.textContent.length, 0),
        backdrop: all('*').filter(e => { const c = getComputedStyle(e); return (c.backdropFilter && c.backdropFilter !== 'none') || (c.webkitBackdropFilter && c.webkitBackdropFilter !== 'none'); }).length,
        jsonld: all('script[type="application/ld+json"]').length,
        textLength: (q('main') || document.body).innerText.length,
      };
    });
    const bytes = await page.evaluate(() => performance.getEntriesByType('resource').reduce((n, r) => n + (r.transferSize || r.encodedBodySize || 0), 0) + (performance.getEntriesByType('navigation')[0]?.transferSize || 0));
    out.push({ page: p, ...info, bytes, ...log });
    page.removeAllListeners();
  }
  record('pages', out);
});

test('layout: horizontal overflow at six widths, light and dark screenshots', async ({ page }) => {
  test.setTimeout(300000);
  const out = [];
  for (const p of site.pages) {
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + p, { waitUntil: 'networkidle' });
      const m = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        offenders: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && getComputedStyle(e).position !== 'fixed').slice(0, 3).map(e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')) }));
      out.push({ page: p, width, ...m });
    }
  }
  record('layout', out);
  const home = '/index.html';
  for (const [w, scheme] of [[390, 'light'], [1440, 'light'], [1440, 'dark'], [390, 'dark']]) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(base + home, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await shot(page, `home-${w}-${scheme}`, { fullPage: true });
  }
  await page.emulateMedia({ colorScheme: 'light' });
  for (const p of site.pages.filter(p => p !== home)) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await shot(page, 'page-' + p.replace(/^\//, '').replace(/[\/.]/g, '_'), { fullPage: true });
  }
});

test('axe: every page in light and dark', async ({ page }) => {
  test.setTimeout(300000);
  const out = {};
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    for (const p of [...site.pages, ...site.orphans.map(f => '/' + f)]) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(base + p, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await page.addScriptTag({ path: AXE });
      out[`${scheme} ${p}`] = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] });
        return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })),
          incomplete: r.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length })) };
      });
    }
  }
  record('axe', out);
});

test('mobile navigation by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const header = document.querySelector('header') || document.body;
    const links = [...header.querySelectorAll('nav a')];
    const visible = links.filter(a => { const b = a.getBoundingClientRect(); return b.width && b.height && b.bottom > 0 && b.right > 0 && b.left < innerWidth; });
    const toggle = [...header.querySelectorAll('button[aria-expanded], [role="button"][aria-expanded]')].find(b => b.getClientRects().length);
    return { links: links.length, visibleLinks: visible.length, toggle: toggle ? (toggle.id || toggle.getAttribute('aria-label') || toggle.textContent.trim()) : null,
      bottomBar: [...document.querySelectorAll('nav')].some(n => { const b = n.getBoundingClientRect(); const c = getComputedStyle(n); return c.position === 'fixed' && b.bottom >= innerHeight - 2 && b.top > innerHeight / 2; }) };
  });
  if (r.toggle) {
    const toggle = page.locator('header button[aria-expanded], header [role="button"][aria-expanded]').first();
    await toggle.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    r.expandedAfterEnter = await toggle.getAttribute('aria-expanded');
    r.visibleAfterOpen = await page.evaluate(() => [...(document.querySelector('header') || document.body).querySelectorAll('nav a, [id] a')].filter(a => { const b = a.getBoundingClientRect(); const c = getComputedStyle(a); return b.width && b.height && c.visibility !== 'hidden' && b.bottom > 0 && b.top < innerHeight; }).length);
    await page.keyboard.press('Tab');
    r.tabLandsIn = await page.evaluate(() => document.activeElement.closest('nav, [role="dialog"], header') ? 'menu/header' : document.activeElement.tagName);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    r.expandedAfterEscape = await toggle.getAttribute('aria-expanded');
    r.focusAfterEscape = await page.evaluate(() => document.activeElement.getAttribute('aria-expanded') !== null ? 'toggle' : document.activeElement.tagName);
  }
  await shot(page, 'mobile-nav-390');
  record('mobile-nav', r);
});

test('keyboard: focus is visible on the first 20 stops of the home page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
  const stops = [];
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate(() => {
      const a = document.activeElement; if (!a || a === document.body) return null;
      const c = getComputedStyle(a);
      const ring = (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) || (c.boxShadow && c.boxShadow !== 'none');
      return { el: (a.tagName + ' ' + (a.getAttribute('aria-label') || a.textContent.trim()).slice(0, 24)), ring };
    }));
  }
  record('keyboard', stops);
});

test('contact form: empty submit, then a valid submit', async ({ page }) => {
  const candidates = site.pages.filter(p => /contact|联系/i.test(p));
  let target = candidates[0];
  if (!target) for (const p of site.pages) { await page.goto(base + p); if (await page.locator('main form, form').count() && await page.locator('textarea').count()) { target = p; break; } }
  const r = { page: target || null };
  if (target) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + target, { waitUntil: 'networkidle' });
    const form = page.locator('form:has(textarea), form').first();
    r.fields = await form.evaluate(f => [...f.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select')].map(e => ({
      name: e.name || e.id, type: e.type, required: e.required || e.getAttribute('aria-required') === 'true',
      labelled: !!(e.labels && e.labels.length) || !!e.getAttribute('aria-label') || !!e.getAttribute('aria-labelledby'), autocomplete: e.getAttribute('autocomplete') })));
    const submit = form.locator('button[type=submit], button:not([type]), input[type=submit]').first();
    await submit.click(); await page.waitForTimeout(500);
    r.afterEmpty = await page.evaluate(() => ({ invalidAria: document.querySelectorAll('[aria-invalid="true"]').length, invalidNative: document.querySelectorAll('form :invalid').length,
      focus: document.activeElement.tagName + ' ' + (document.activeElement.name || document.activeElement.id), alerts: [...document.querySelectorAll('[role=alert],[role=status],[aria-live]')].map(e => e.textContent.trim()).filter(Boolean) }));
    await shot(page, 'contact-empty-submit');
    await form.evaluate(f => {
      // Only what a person can see and reach: honeypot fields stay empty.
      const reachable = e => e.getClientRects().length && !e.closest('[aria-hidden="true"],[hidden]') && e.tabIndex !== -1 && getComputedStyle(e).visibility !== 'hidden'
        && (() => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.right > 0 && r.left < innerWidth + 5000; })();
      const groups = new Set();
      for (const e of f.querySelectorAll('input:not([type=hidden]), textarea, select')) {
        if (!reachable(e)) continue;
        if (e.type === 'radio') { if (!groups.has(e.name)) { groups.add(e.name); e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); } continue; }
        if (e.type === 'checkbox') { if (e.required || /同意|agree|隐私/.test(e.closest('label')?.textContent || '')) { e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); } continue; }
        if (e.tagName === 'SELECT') { e.selectedIndex = Math.max(1, e.selectedIndex); continue; }
        e.value = e.type === 'email' ? 'lin@example.com' : e.type === 'tel' ? '13800000000' : e.tagName === 'TEXTAREA' ? '导出 CSV 时金额格式不对，希望修复。' : '林晓';
        e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    const before = await page.evaluate(() => document.body.innerText);
    await submit.click(); await page.waitForTimeout(4000);
    r.afterValid = await page.evaluate(prev => ({ url: location.pathname, invalidAria: document.querySelectorAll('[aria-invalid="true"]').length,
      liveText: [...document.querySelectorAll('[role=alert],[role=status],[aria-live]')].map(e => e.textContent.trim()).filter(Boolean),
      changed: document.body.innerText !== prev, focus: document.activeElement.tagName + ' ' + (document.activeElement.id || '') }), before);
    await shot(page, 'contact-valid-submit');
  }
  record('contact', r);
});

test('reduced motion and forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const motion = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && (a.effect.getTiming().duration || 0) > 10).map(a => a.animationName || a.transitionProperty || 'animation'));
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
  await shot(page, 'forced-colors-home');
  record('preferences', { runningAnimationsWithReducedMotion: motion });
});

test('404 page exists and links home', async ({ page }) => {
  const f = site.files.find(f => /^404\.html?$/.test(f));
  const r = { file: f || null };
  if (f) {
    await page.goto(base + '/' + f);
    r.title = await page.title();
    r.linksHome = await page.evaluate(() => [...document.querySelectorAll('a[href]')].some(a => /(^|\/)(index\.html)?$|^\.\/?$|^\/$/.test(a.getAttribute('href'))));
    r.noindex = await page.evaluate(() => /noindex/.test(document.querySelector('meta[name=robots]')?.content || ''));
    await shot(page, '404');
    // A static host answers a missing nested path with 404.html at that path:
    // relative asset URLs then resolve against the wrong directory.
    const res = await page.goto(base + '/no/such/deep/page');
    r.nestedStatus = res.status();
    r.nestedStyled = await page.evaluate(() => [...document.styleSheets].some(s => { try { return s.cssRules.length > 5; } catch { return false; } }));
    r.nestedLinksWork = await page.evaluate(async () => { const hrefs = [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin)).slice(0, 5);
      const st = await Promise.all(hrefs.map(h => fetch(h).then(r => r.status))); return { checked: hrefs.length, ok: st.filter(s => s === 200).length }; });
    await shot(page, '404-nested');
  }
  record('404', r);
});
