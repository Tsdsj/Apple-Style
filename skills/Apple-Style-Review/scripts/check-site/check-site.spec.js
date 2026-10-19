// check-site: Playwright checks for a static site directory.
// Inputs (env), outputs and what each check means: README.md in this directory.
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { test } = loadPlaywright();

function loadPlaywright() {
  // This file can live outside the project it checks (an installed skill), so resolve
  // @playwright/test from the project the user runs it in, then from this directory.
  for (const from of [process.cwd(), __dirname]) {
    try { return require(require.resolve('@playwright/test', { paths: [from] })); } catch (e) { /* next */ }
  }
  throw new Error('check-site needs @playwright/test: run it from a project that has it (npm i -D @playwright/test)');
}

const env = process.env;
if (!env.SITE) throw new Error('check-site: SITE is required (the static site directory to check)');
const SITE = path.resolve(env.SITE);
if (!fs.statSync(SITE).isDirectory()) throw new Error(`check-site: SITE is not a directory: ${SITE}`);
const PORT = Number(env.PORT || 9311);
const OUT = path.resolve(env.OUT || 'check-site-out');
const BASE = `http://127.0.0.1:${PORT}`;
const WIDTHS = (env.WIDTHS || '320,390,768,1024,1440').split(',').map(Number).filter((n) => n > 0);
const AXE = env.AXE ? path.resolve(env.AXE) : '';
const LIGHTHOUSE = env.LIGHTHOUSE || '';
const MENU = env.MENU || '';
const PYTHON = env.PYTHON || 'python3';
const KB = 1000; // decimal KB, as in the eval README
const CSS_BUDGET = 80 * KB;
const JS_BUDGET = 5 * KB;
const MAX = 20;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const START = Date.now();

const keyOf = (p) => (p.endsWith('/') ? p + 'index.html' : p);
const normPath = (p) => keyOf(p.startsWith('/') ? p : '/' + p);
const PAGES = env.PAGES ? env.PAGES.split(',').map((s) => s.trim()).filter(Boolean).map(normPath) : null;
const FORM = env.FORM ? normPath(env.FORM.trim()) : '';
const isHtmlPath = (p) => p.endsWith('/') || /\.html?$/i.test(p) || !path.posix.extname(p);
const kb = (n) => `${(n / KB).toFixed(1)} KB`;

// Review checklist item and check name for each check id (the Review skill uses the item names).
const CHECKS = [
  ['1', 'Crawl and anchors', 'Broken internal links and #anchors'],
  ['2', 'Per-page metadata', 'Metadata, headings and landmarks per page'],
  ['3', '320 px overflow', 'Horizontal overflow at each width'],
  ['4', 'Running-text links', 'Links in running text distinguishable without colour'],
  ['5', 'axe light and dark', 'axe-core WCAG 2.2 AA and best practice, light and dark'],
  ['6', 'Keyboard narrow menu', 'Narrow-screen menu: Tab, Enter, Esc, focus return'],
  ['7', 'Focus visible', 'Focus indicator on the first 20 Tab stops'],
  ['8', 'Form empty and valid submit', 'Form errors and focus; success message'],
  ['9', 'Deep-path 404', 'Missing deep path: 404, noindex, styles'],
  ['10', 'No-JS browsing', 'Primary navigation and main content without JavaScript'],
  ['11', 'Preferences', 'Reduced motion and forced colours'],
  ['12', 'Budget and LCP', 'Render-blocking CSS and JS budget; optional Lighthouse'],
  ['13', 'Console and requests', 'Console errors, failed and external requests'],
];
const results = new Map(CHECKS.map(([id, item, name]) => [id, {
  id, item, name, ran: false, status: 'not checked', reason: '', summary: '', evidence: [], evidenceTotal: 0, notes: [], data: {},
}]));
const note = (c, line) => { c.evidenceTotal++; if (c.evidence.length < MAX) c.evidence.push(line); };
const addNote = (c, line) => { if (c.notes.length < MAX) c.notes.push(line); };
const notChecked = (c, reason) => { c.status = 'not checked'; c.reason = reason; };
const notApplicable = (c, reason) => { c.status = 'not applicable'; c.reason = reason; };
const finish = (c, okSummary) => {
  if (c.evidenceTotal) c.status = 'fail';
  else { c.status = 'pass'; c.summary = okSummary; }
};

let S = null;        // crawl state
let server = null;   // serve.py child process
const homeKey = () => (S.pages.includes('/index.html') ? '/index.html' : S.pages[0]);
const settle = (page) => page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
function noPages(c) {
  if (S.pages.length) return false;
  notChecked(c, `no page answered 200 (start ${S.start} returned ${S.startStatus})`);
  return true;
}

// ---------------------------------------------------------------- server ----
function startServer() {
  const child = spawn(PYTHON, [path.join(__dirname, 'serve.py'), SITE, String(PORT)], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  child.stderr.on('data', (d) => { err += d; });
  child.on('error', (e) => { err += e.message; });
  process.on('exit', () => child.kill());
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 15000;
    const probe = () => {
      if (child.exitCode !== null) return reject(new Error(`serve.py exited; port ${PORT} in use? ${err.trim().split('\n').pop() || ''}`));
      http.get(BASE + '/', (res) => { res.resume(); resolve(child); })
        .on('error', () => (Date.now() > deadline ? reject(new Error(`no server on port ${PORT}`)) : setTimeout(probe, 150)));
    };
    probe();
  });
}

// ------------------------------------------------------------ browser code ----
// Functions below run inside the page (page.evaluate): they must not use Node variables.
function pageFacts() {
  const all = (s) => Array.from(document.querySelectorAll(s));
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const opaque = (c) => !!c && c !== 'transparent' && !/^rgba\(.*,\s*0(\.0*)?\)$/.test(c);
  const sel = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '')
    + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '');
  const decorated = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.textDecorationLine.includes('underline')) return true;
      if (s.display !== 'inline') break;
    }
    return false;
  };
  const headings = all('h1,h2,h3,h4,h5,h6').filter(shown).map((h) => Number(h.tagName[1]));
  let skipped = 0;
  headings.forEach((lvl, i) => { if (i && lvl > headings[i - 1] + 1) skipped++; });
  const focusable = all('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')
    .filter((e) => !e.disabled && !e.closest('[hidden],[inert]'));
  let skip = 'none among the first 3 focusable elements';
  const cand = focusable.slice(0, 3).find((e) => e.tagName === 'A' && /^#./.test(e.getAttribute('href') || ''));
  if (cand) {
    let id = cand.getAttribute('href').slice(1);
    try { id = decodeURIComponent(id); } catch (e) { /* keep raw */ }
    skip = document.getElementById(id) ? 'ok' : `target #${id} missing`;
  }
  const lum = (c) => {
    const m = (c || '').match(/[\d.]+/g);
    if (!m || m.length < 3) return 0;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(+m[0]) + 0.7152 * f(+m[1]) + 0.0722 * f(+m[2]);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // Nearest block-level ancestor: a link in a heading or a button is not running text.
  const blockOf = (el) => { let e = el.parentElement; while (e && getComputedStyle(e).display === 'inline') e = e.parentElement; return e; };
  let running = 0;
  const plain = [];
  for (const a of all('a[href]')) {
    if (!shown(a) || !clean(a.textContent) || a.closest('nav')) continue;
    const s = getComputedStyle(a);
    const blk = blockOf(a);
    if (s.display !== 'inline' || !blk || !blk.matches('p,li,dd,td,blockquote,figcaption')) continue;
    // Running text has other words in the same block; a list item that is only a link is not.
    if (clean(blk.textContent).length <= clean(a.textContent).length) continue;
    running++;
    const border = s.borderBottomStyle !== 'none' && parseFloat(s.borderBottomWidth) > 0 && opaque(s.borderBottomColor);
    const bg = opaque(s.backgroundColor) || s.backgroundImage !== 'none';
    if (!decorated(a) && !border && !bg) {
      const r = ratio(s.color, getComputedStyle(blk).color);
      plain.push(`"${clean(a.textContent).slice(0, 30)}" (${sel(a)}, ${r.toFixed(1)}:1 to the text${r >= 3 ? '; axe accepts 3:1 or more' : ''})`);
    }
  }
  const d = document.querySelector('meta[name="description"]');
  const vp = document.querySelector('meta[name="viewport"]');
  const cs = document.querySelector('meta[name="color-scheme"]');
  const can = document.querySelector('link[rel="canonical"]');
  return {
    ids: all('[id]').map((e) => e.id).concat(all('a[name]').map((a) => a.getAttribute('name'))),
    links: all('a[href]').map((a) => a.getAttribute('href')),
    facts: {
      lang: document.documentElement.getAttribute('lang') || '',
      title: clean(document.title),
      description: d ? clean(d.getAttribute('content')) : '',
      canonical: can ? can.getAttribute('href') || '' : '',
      viewport: vp ? vp.getAttribute('content') || '' : '',
      colorScheme: cs ? cs.getAttribute('content') || '' : '',
      h1: all('h1').filter(shown).length,
      headingSkips: skipped,
      landmarks: {
        main: all('main,[role="main"]').length,
        banner: all('header,[role="banner"]').length,
        contentinfo: all('footer,[role="contentinfo"]').length,
      },
      skip,
      forms: all('form').length,
      running,
      plain,
    },
  };
}

function overflowFacts() {
  const se = document.scrollingElement || document.documentElement;
  const W = se.clientWidth;
  if (se.scrollWidth <= W + 1) return { over: 0 };
  let widest = null;
  for (const e of document.body.querySelectorAll('*')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.right <= W + 1 || getComputedStyle(e).position === 'fixed') continue;
    if (!widest || r.right > widest.right) {
      const cls = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '';
      widest = { right: r.right, sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + cls };
    }
  }
  return { over: se.scrollWidth - W, widest: widest ? `${widest.sel} right edge at ${Math.round(widest.right)} px` : 'unknown' };
}

function menuVisibleLinks(el) {
  const id = el.getAttribute('aria-controls');
  const panel = (id && document.getElementById(id)) || el.closest('nav') || document.body;
  return Array.from(panel.querySelectorAll('a[href]')).filter((a) => {
    const r = a.getBoundingClientRect();
    const s = getComputedStyle(a);
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && s.visibility !== 'hidden' && s.display !== 'none';
  }).length;
}

function focusIndicator(el) {
  const opaque = (c) => !!c && c !== 'transparent' && !/^rgba\(.*,\s*0(\.0*)?\)$/.test(c);
  const label = (el.innerText || el.getAttribute('aria-label') || el.value || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 30)
    + ' <' + el.tagName.toLowerCase() + '>';
  const s = getComputedStyle(el);
  const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 && opaque(s.outlineColor);
  const focusedShadow = s.boxShadow;
  el.blur();
  const idleShadow = getComputedStyle(el).boxShadow;
  el.focus({ preventScroll: true });
  return { label, outline, ring: outline || (focusedShadow !== 'none' && focusedShadow !== idleShadow) };
}

function tagForm() {
  const SKIP = ['hidden', 'submit', 'button', 'reset', 'image'];
  const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const form = Array.from(document.querySelectorAll('form'))
    .find((f) => f.querySelector('input,textarea,select') && f.querySelector('button, input[type=submit]'));
  if (!form) return { error: 'no form with a field and a submit control on this page' };
  form.setAttribute('data-cs', 'form');
  const submit = form.querySelector('button[type=submit], input[type=submit], button:not([type])');
  if (submit) submit.setAttribute('data-cs', 'submit');
  const fields = [];
  let n = 0;
  for (const e of form.querySelectorAll('input, textarea, select')) {
    if (SKIP.includes(e.type)) continue;
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    const label = e.labels && e.labels[0];
    // Honeypot, hidden, off-screen, aria-hidden and tabindex=-1 fields are never filled.
    const onscreen = r.right > 0 && r.left < innerWidth;
    const visible = onscreen && ((r.width > 2 && r.height > 2) || (label && shown(label)));
    const inert = e.disabled || e.tabIndex === -1 || e.closest('[hidden],[aria-hidden="true"],[inert]');
    if (inert || !visible || cs.opacity === '0' || cs.visibility === 'hidden') continue;
    const id = 'f' + n++;
    e.setAttribute('data-cs', id);
    const radios = e.type === 'radio' ? Array.from(form.querySelectorAll('input[type=radio]')).filter((g) => g.name === e.name) : [];
    fields.push({
      id, tag: e.tagName.toLowerCase(), type: e.type, name: e.name || e.id || '',
      autocomplete: e.getAttribute('autocomplete') || '',
      requiredGroup: e.type === 'radio' ? radios.some((g) => g.required) : (e.type === 'checkbox' ? e.required : false),
    });
  }
  return { fields, hasSubmit: !!submit };
}

function afterEmpty() {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const form = document.querySelector('[data-cs="form"]');
  const invalid = Array.from(form.querySelectorAll('input,textarea,select'))
    .filter((e) => !['hidden', 'submit', 'button', 'reset', 'image'].includes(e.type)
      && (e.getAttribute('aria-invalid') === 'true' || e.matches(':invalid')));
  const first = invalid[0];
  const live = Array.from(document.querySelectorAll('[role="alert"],[role="status"],[aria-live]:not([aria-live="off"])'))
    .map((e) => clean(e.innerText)).filter(Boolean);
  return {
    count: invalid.length,
    first: first ? (first.name || first.id || first.type) : '',
    focusOnFirst: !!first && document.activeElement === first,
    // An error summary that takes focus and links to the invalid fields is the other accepted pattern.
    focusOnSummary: !!document.activeElement && invalid.some((f) => f.id
      && document.activeElement.querySelector(`a[href="#${CSS.escape(f.id)}"]`)),
    announced: live.length > 0 || (!!first && first.matches(':invalid')),
  };
}

function successSince(arg) {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const cands = document.querySelectorAll('[role="status"],[role="alert"],[aria-live]:not([aria-live="off"]),'
    + '[class*="success" i],[class*="thank" i],[class*="sent" i],[id*="success" i],[id*="thank" i],[data-success]');
  for (const e of cands) {
    if (!shown(e)) continue;
    const t = clean(e.innerText);
    if (t && !clean(arg.before).includes(t)) return { signal: 'live region or success element', text: t.slice(0, 80) };
  }
  if (location.href !== arg.startHref) {
    const t = clean(document.body.innerText);
    if (t && t !== clean(arg.before)) return { signal: 'navigated to a new page', text: t.slice(0, 80) };
  }
  return null;
}

function runningAnimations() {
  return document.getAnimations()
    .filter((a) => a.playState === 'running' && (a instanceof CSSAnimation || a instanceof CSSTransition))
    .map((a) => {
      const t = a.effect.getTiming();
      return { kind: a instanceof CSSAnimation ? 'animation' : 'transition', name: a.animationName || a.transitionProperty, duration: Number(t.duration) || 0, iterations: String(t.iterations) };
    })
    .filter((x) => x.duration > 10);
}

function forcedVisibility() {
  const opaque = (c) => !!c && c !== 'transparent' && !/^rgba\(.*,\s*0(\.0*)?\)$/.test(c);
  const bad = [];
  let count = 0;
  for (const el of Array.from(document.querySelectorAll('a[href], button, input[type=submit], input[type=button], [role=button]'))) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || s.visibility === 'hidden') continue;
    count++;
    const text = (el.innerText || el.value || '').trim().length > 0
      || Array.from(el.querySelectorAll('img, svg, picture, video')).some((m) => { const b = m.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
    const border = ['Top', 'Right', 'Bottom', 'Left'].some((d) => parseFloat(s['border' + d + 'Width']) > 0
      && s['border' + d + 'Style'] !== 'none' && opaque(s['border' + d + 'Color']));
    const outline = parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== 'none' && opaque(s.outlineColor);
    if (!border && !outline && !(text && opaque(s.color))) {
      bad.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 20)}"`);
    }
  }
  return { count, bad };
}

function noJsFacts() {
  const nav = document.querySelector('header nav') || Array.from(document.querySelectorAll('nav')).find((n) => n.querySelector('a[href]'));
  const links = nav ? Array.from(nav.querySelectorAll('a[href]')) : [];
  const reachableOf = (a) => {
    if (a.closest('details:not([open])')) return true;
    const r = a.getBoundingClientRect();
    const s = getComputedStyle(a);
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const main = document.querySelector('main') || document.body;
  const hidden = links.filter((a) => !reachableOf(a)).map((a) => a.textContent.trim().slice(0, 20));
  return { navLinks: links.length, reachable: links.length - hidden.length, hidden, mainText: main.innerText.trim().length > 0 };
}

function bodyStyle() {
  const s = getComputedStyle(document.body);
  return { fontFamily: s.fontFamily, backgroundColor: s.backgroundColor, color: s.color };
}

// Light estimate of minified CSS: comments and whitespace removed. A real minifier gives less.
function minifyEstimate(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};:,>~])\s*/g, '$1').replace(/;}/g, '}').trim();
}

// ----------------------------------------------------------------- crawl ----
function toRef(from, href) {
  if (!href || /^(mailto|tel|sms|javascript|data):/i.test(href)) return [];
  let u;
  try { u = new URL(href, BASE + from); } catch (e) { return []; }
  if (u.origin !== BASE) return [];
  const to = keyOf(u.pathname);
  let hash = '';
  try { hash = u.hash.length > 1 ? decodeURIComponent(u.hash.slice(1)) : ''; } catch (e) { hash = u.hash.slice(1); }
  return [{ from, href, to, kind: isHtmlPath(to) ? 'html' : 'asset', hash }];
}

async function crawl(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let log = null; // collects console, network and external events for the page being visited
  page.on('console', (m) => {
    if (log && m.type() === 'error' && !/Failed to load resource/.test(m.text())) log.errors.push('console: ' + m.text().slice(0, 160));
  });
  page.on('pageerror', (e) => { if (log) log.errors.push('page error: ' + e.message.slice(0, 160)); });
  page.on('response', (r) => {
    if (!log || r.request().resourceType() === 'document' || r.status() < 400) return;
    if (new URL(r.url()).pathname === '/favicon.ico') return; // favicon is optional
    log.failed.push(`${r.status()} ${r.url().slice(0, 140)}`);
  });
  page.on('requestfailed', (r) => {
    if (log && r.resourceType() !== 'document') log.failed.push(`${(r.failure() || {}).errorText || 'failed'} ${r.url().slice(0, 140)}`);
  });
  page.on('request', (r) => {
    if (!log) return;
    const u = new URL(r.url());
    if (/^https?:$/.test(u.protocol) && u.origin !== BASE) log.external.push(r.url().slice(0, 160));
  });

  const visits = new Map();
  async function visit(key) {
    if (visits.has(key)) return visits.get(key);
    const v = { key, status: 0, html: false, ids: new Set(), refs: [], facts: null, errors: [], failed: [], external: [], error: '' };
    visits.set(key, v);
    log = v;
    try {
      const res = await page.goto(BASE + key, { waitUntil: 'load', timeout: 30000 });
      v.status = res ? res.status() : 0;
      v.html = !!res && /html/i.test(res.headers()['content-type'] || '');
      if (v.status === 200 && v.html) {
        await settle(page);
        const d = await page.evaluate(pageFacts);
        v.ids = new Set(d.ids);
        v.facts = d.facts;
        v.refs = d.links.flatMap((href) => toRef(key, href));
      }
    } catch (e) {
      v.error = String(e.message || e).split('\n')[0];
    } finally {
      log = null;
    }
    return v;
  }
  async function requestStatus(p) {
    const r = await page.request.get(BASE + p, { failOnStatusCode: false, timeout: 15000 }).catch(() => null);
    return r ? r.status() : 0;
  }

  const start = PAGES ? PAGES[0] : normPath('/');
  const queue = PAGES ? PAGES.slice() : [start];
  const seen = new Set();
  const checked = [];
  while (queue.length) {
    const key = queue.shift();
    if (seen.has(key)) continue;
    seen.add(key);
    const v = await visit(key);
    if (v.status !== 200 || !v.html) continue;
    checked.push(key);
    if (!PAGES) for (const r of v.refs) if (r.kind === 'html' && !seen.has(r.to)) queue.push(r.to);
  }

  const allRefs = checked.flatMap((k) => visits.get(k).refs);
  const statusOf = new Map();
  for (const r of allRefs) {
    if (statusOf.has(r.to)) continue;
    statusOf.set(r.to, r.kind === 'html' ? (await visit(r.to)).status : await requestStatus(r.to));
  }
  const broken = [];
  const missing = [];
  const seenBroken = new Set();
  let hashLinks = 0;
  for (const r of allRefs) {
    const st = statusOf.get(r.to);
    const id = r.from + ' ' + r.href;
    if (!(st >= 200 && st < 300) && !seenBroken.has(id)) {
      seenBroken.add(id);
      broken.push({ from: r.from, href: r.href, status: st });
    }
    if (r.hash && r.hash !== 'top') {
      hashLinks++;
      const tv = visits.get(r.to);
      if (tv && tv.status === 200 && tv.html && !tv.ids.has(r.hash)) missing.push({ from: r.from, to: r.to, id: r.hash });
    }
  }
  await ctx.close();
  return {
    start, startStatus: visits.get(start) ? visits.get(start).status : 0,
    pages: checked, pageData: checked.map((k) => visits.get(k)),
    broken, missing, linkCount: allRefs.length, hashLinks,
  };
}

// ----------------------------------------------------------------- tests ----
test.beforeAll(async ({ browser }) => {
  try {
    server = await startServer();
    S = await crawl(browser);
  } catch (e) {
    S = { error: String(e.message || e).split('\n')[0], pages: [], pageData: [], start: '', startStatus: 0 };
  }
});

test.afterAll(async () => {
  if (server) server.kill();
});

function check(id, fn) {
  test(`check ${id}: ${results.get(id).name}`, async ({ browser }) => {
    const c = results.get(id);
    c.ran = true;
    try {
      if (!S || S.error) notChecked(c, `crawl did not run: ${S ? S.error : 'no state'}`);
      else await fn(c, browser);
    } catch (e) {
      notChecked(c, `error: ${String(e && e.message || e).split('\n')[0]}`);
    }
    // Do not throw here: Playwright restarts the worker after a failed test and loses this state.
    test.info().annotations.push({ type: 'check-site', description: `${id} ${c.name}: ${c.status}` });
  });
}

check('1', async (c) => {
  if (!S.pages.length) {
    note(c, `no page answered 200 (start ${S.start} returned ${S.startStatus})`);
    c.status = 'fail';
    return;
  }
  for (const b of S.broken) note(c, `${b.from} links to ${b.href} → ${b.status || 'no response'}`);
  for (const m of S.missing) note(c, `${m.from} links to ${m.to}#${m.id}: no such id on ${m.to}`);
  c.data = { pages: S.pages.length, links: S.linkCount, hashLinks: S.hashLinks, broken: S.broken.length, missingAnchors: S.missing.length };
  finish(c, `${S.pages.length} pages, ${S.linkCount} internal links, ${S.hashLinks} #anchors: all resolve`);
});

check('2', async (c) => {
  if (noPages(c)) return;
  const titles = new Map();
  for (const p of S.pageData) {
    const f = p.facts;
    const probs = [];
    if (!f.lang) probs.push('no lang on <html>');
    if (!f.title) probs.push('empty <title>');
    else if (titles.has(f.title)) probs.push(`title is the same as ${titles.get(f.title)}`);
    else titles.set(f.title, p.key);
    if (!f.description) probs.push('meta description missing');
    if (!f.canonical) probs.push('no canonical link');
    if (!f.viewport) probs.push('no viewport meta');
    else {
      const vp = f.viewport.toLowerCase();
      const ms = /maximum-scale\s*=\s*([\d.]+)/.exec(vp);
      if (/user-scalable\s*=\s*(no|0)\b/.test(vp)) probs.push('viewport disables zoom (user-scalable)');
      if (ms && Number(ms[1]) < 2) probs.push(`viewport maximum-scale ${ms[1]} is below 2`);
    }
    if (!f.colorScheme) probs.push('no color-scheme meta');
    if (f.h1 !== 1) probs.push(`h1 count ${f.h1} (want 1)`);
    if (f.headingSkips) probs.push(`${f.headingSkips} skipped heading level(s)`);
    if (!f.landmarks.main) probs.push('no main landmark');
    if (!f.landmarks.banner) probs.push('no header/banner landmark');
    if (!f.landmarks.contentinfo) probs.push('no footer/contentinfo landmark');
    if (f.skip !== 'ok') probs.push(`skip link: ${f.skip}`);
    for (const pr of probs) note(c, `${p.key}: ${pr}`);
  }
  finish(c, `${S.pages.length} pages: metadata, one h1, no skipped levels, landmarks and skip link present`);
});

check('3', async (c, browser) => {
  if (noPages(c)) return;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 800 } });
  const page = await ctx.newPage();
  let n = 0;
  try {
    for (const w of WIDTHS) {
      for (const p of S.pages) {
        await page.setViewportSize({ width: w, height: 800 });
        await page.goto(BASE + p, { waitUntil: 'load' });
        const o = await page.evaluate(overflowFacts);
        n++;
        if (o.over) note(c, `${p} @${w}px: page is ${o.over} px wider than the viewport; widest: ${o.widest}`);
      }
    }
  } finally {
    await ctx.close();
  }
  c.data = { combinations: n, widths: WIDTHS };
  finish(c, `${n} page × width combinations (${WIDTHS.join(', ')} px): no horizontal overflow`);
});

check('4', async (c) => {
  if (noPages(c)) return;
  let running = 0;
  for (const p of S.pageData) {
    running += p.facts.running;
    for (const x of p.facts.plain) note(c, `${p.key}: ${x}`);
  }
  if (!running) return notApplicable(c, 'no links in running text on the checked pages');
  c.data = { runningTextLinks: running };
  finish(c, `${running} running-text link(s): each underlined, or with a border or background`);
});

check('5', async (c, browser) => {
  if (!AXE) return notChecked(c, 'AXE not set: give the path to axe.min.js (axe-core 4.10.2); axe did not run, so this is not a pass');
  if (!fs.existsSync(AXE)) return notChecked(c, `AXE file not found: ${AXE}`);
  if (noPages(c)) return;
  const agg = new Map();
  let runs = 0;
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: scheme, reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    try {
      for (const p of S.pages) {
        await page.goto(BASE + p, { waitUntil: 'load' });
        await settle(page);
        await page.waitForTimeout(500);
        await page.addScriptTag({ path: AXE });
        const violations = await page.evaluate(async (tags) => {
          const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
          return r.violations.map((v) => ({ id: v.id, impact: v.impact || 'unknown', help: v.help, targets: v.nodes.map((n) => n.target.join(' ')) }));
        }, AXE_TAGS);
        runs++;
        for (const v of violations) {
          const k = scheme + ' ' + v.id;
          const a = agg.get(k) || { scheme, id: v.id, impact: v.impact, help: v.help, nodes: 0, pages: [], example: '' };
          a.nodes += v.targets.length;
          a.pages.push(p);
          if (!a.example && v.targets.length) a.example = v.targets[0];
          agg.set(k, a);
        }
      }
    } finally {
      await ctx.close();
    }
  }
  const serious = [...agg.values()].filter((a) => a.impact === 'critical' || a.impact === 'serious');
  for (const a of serious) {
    note(c, `${a.scheme}: ${a.id} (${a.impact}) ${a.nodes} node(s) on ${a.pages.join(', ')}; e.g. ${a.example}`);
  }
  for (const a of agg.values()) {
    if (a.impact !== 'critical' && a.impact !== 'serious') {
      addNote(c, `${a.scheme}: ${a.id} (${a.impact}) ${a.nodes} node(s) on ${a.pages.length} page(s) — not failing`);
    }
  }
  c.data = { runs, rules: [...agg.values()].map(({ scheme, id, impact, nodes, pages }) => ({ scheme, id, impact, nodes, pages: pages.length })) };
  finish(c, `axe ran ${runs} page × scheme times: no serious or critical violations`);
});

check('6', async (c, browser) => {
  if (noPages(c)) return;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + homeKey(), { waitUntil: 'load' });
    await settle(page);
    let toggle = null;
    let toggleSel = '';
    for (const sel of MENU ? [MENU] : ['[data-site-nav] button[aria-controls]', 'header button[aria-expanded][aria-controls]']) {
      for (const h of await page.$$(sel)) {
        if (await h.isVisible()) { toggle = h; toggleSel = sel; break; }
      }
      if (toggle) break;
    }
    if (!toggle) {
      const shownLinks = await page.evaluate(() => Array.from(document.querySelectorAll('header nav a[href], nav a[href]'))
        .filter((a) => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth; }).length);
      if (shownLinks > 0) return notApplicable(c, `no menu toggle found at 390 px; ${shownLinks} nav links are visible`);
      note(c, 'no menu toggle found at 390 px and no nav links visible');
      return finish(c, '');
    }
    await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    let presses = 0;
    let reached = false;
    while (!reached && presses < 60) {
      await page.keyboard.press('Tab');
      presses++;
      reached = await toggle.evaluate((el) => el === document.activeElement);
    }
    if (!reached) {
      note(c, `menu toggle ${toggleSel} not reached by Tab in 60 presses`);
      return finish(c, '');
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    const open = { expanded: await toggle.getAttribute('aria-expanded'), links: await toggle.evaluate(menuVisibleLinks) };
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const esc = {
      expanded: await toggle.getAttribute('aria-expanded'),
      links: await toggle.evaluate(menuVisibleLinks),
      focus: await toggle.evaluate((el) => el === document.activeElement),
    };
    c.data = { toggle: toggleSel, presses, open, esc };
    if (open.expanded !== 'true' || open.links === 0) note(c, `Enter did not open the menu (aria-expanded=${open.expanded}, visible links ${open.links})`);
    if (esc.expanded === 'true' || esc.links > 0) note(c, `closed after Esc: no (aria-expanded=${esc.expanded}, visible links ${esc.links})`);
    if (!esc.focus) note(c, 'focus did not return to the toggle after Esc');
    finish(c, `${toggleSel} reached by Tab (${presses} presses); Enter opens, Esc closes, focus returns`);
  } finally {
    await ctx.close();
  }
});

check('7', async (c, browser) => {
  if (noPages(c)) return;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + homeKey(), { waitUntil: 'load' });
    let stops = 0;
    for (let i = 1; i <= 20; i++) {
      await page.keyboard.press('Tab');
      const el = (await page.evaluateHandle(() => (document.activeElement && document.activeElement !== document.body ? document.activeElement : null))).asElement();
      if (!el) break;
      const r = await el.evaluate(focusIndicator);
      stops++;
      if (!r.ring) note(c, `stop ${i}: ${r.label}: no outline or box-shadow when focused`);
    }
    if (!stops) return notChecked(c, 'no focusable element on the home page');
    c.data = { stops };
    finish(c, `${stops} Tab stops, each with a visible focus indicator`);
  } finally {
    await ctx.close();
  }
});

check('8', async (c, browser) => {
  if (!FORM && noPages(c)) return;
  let key = FORM;
  if (!key) {
    const p = S.pageData.find((x) => x.facts && x.facts.forms > 0);
    key = p ? p.key : '';
  }
  if (!key) return notApplicable(c, 'no page with a form found (set FORM=/path to choose one)');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    const res = await page.goto(BASE + key, { waitUntil: 'load' });
    if (!res || res.status() !== 200) return notChecked(c, `form page ${key} returned ${res ? res.status() : 'no response'}`);
    await settle(page);
    const form = await page.evaluate(tagForm);
    if (form.error) return notChecked(c, form.error);
    if (!form.hasSubmit) return notChecked(c, 'no submit control found in the form');
    const submit = page.locator('[data-cs="submit"]');

    await submit.click();
    await page.waitForTimeout(500);
    const empty = await page.evaluate(afterEmpty);
    if (!empty.count) note(c, 'empty submit: no field marked invalid (aria-invalid or :invalid)');
    else {
      if (!empty.focusOnFirst && !empty.focusOnSummary) note(c, `empty submit: focus is neither on the first invalid field (${empty.first}) nor on an error summary that links to it`);
      if (!empty.announced) note(c, 'empty submit: no error announced (no live-region text, no native validation)');
    }

    for (const f of form.fields) {
      const loc = page.locator(`[data-cs="${f.id}"]`);
      if (f.tag === 'select') await loc.selectOption({ index: 1 }).catch(() => loc.selectOption({ index: 0 }).catch(() => {}));
      else if (f.type === 'checkbox' || f.type === 'radio') { if (f.requiredGroup) await loc.check({ force: true }).catch(() => {}); }
      else await loc.fill(valueFor(f)).catch(() => {});
    }
    const before = await page.evaluate(() => document.body.innerText);
    const startHref = page.url();
    // A form posted to an endpoint that does not exist on this host (static hosting, no backend)
    // cannot show its success state; that half is then not checked rather than passed or failed.
    const endpoint = [];
    page.on('response', (r) => { if (r.request().method() !== 'GET' && r.status() >= 400) endpoint.push(`${r.request().method()} ${new URL(r.url()).pathname} → ${r.status()}`); });
    page.on('requestfailed', (r) => { if (r.method() !== 'GET') endpoint.push(`${r.method()} ${new URL(r.url()).pathname} failed`); });
    await submit.click();
    let found = null;
    const deadline = Date.now() + 4000;
    while (!found && Date.now() < deadline) {
      found = await page.evaluate(successSince, { before, startHref }).catch(() => null);
      if (!found) await page.waitForTimeout(200);
    }
    if (!found) {
      const invalid = await page.evaluate(() => document.querySelectorAll('form :invalid').length).catch(() => 0);
      if (invalid) note(c, `valid submit still blocked: ${invalid} field(s) invalid after filling`);
      note(c, 'valid submit: no success message within 4 s');
    }
    c.data = { page: key, fields: form.fields.length, empty, success: found, endpoint };
    if (endpoint.length && !c.evidenceTotal) {
      return notChecked(c, `empty submit passes; valid submit not verifiable: the form endpoint is not served here (${endpoint[0]}). Check the success state against the real backend.`);
    }
    if (endpoint.length) { c.evidence = c.evidence.filter((e) => !e.startsWith('valid submit')); c.evidenceTotal = c.evidence.length; }
    finish(c, `empty submit marks and focuses the first invalid field; valid submit shows ${found ? found.signal + ': "' + found.text + '"' : ''}`);
  } finally {
    await ctx.close();
  }
});

function valueFor(f) {
  const n = (f.name + ' ' + f.autocomplete).toLowerCase();
  if (f.type === 'email' || /mail/.test(n)) return 'check-site@example.com';
  if (f.type === 'tel' || /phone|tel/.test(n)) return '13800000000';
  if (f.type === 'url') return 'https://example.com/';
  if (f.type === 'number') return '1';
  if (f.type === 'date') return '2026-01-01';
  return 'Check-site test';
}

check('9', async (c, browser) => {
  if (noPages(c)) return;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + homeKey(), { waitUntil: 'load' });
    await settle(page);
    const homeStyle = await page.evaluate(bodyStyle);
    const deep = '/a/b/c/missing-xyz';
    const failedCss = [];
    const seenCss = new Set();
    const onResponse = (r) => {
      if (r.request().resourceType() !== 'stylesheet' || r.status() < 400) return;
      seenCss.add(r.url());
      failedCss.push(`${r.status()} ${new URL(r.url()).pathname}`);
    };
    const onFailed = (r) => {
      if (r.resourceType() !== 'stylesheet' || seenCss.has(r.url())) return;
      failedCss.push(`request failed ${new URL(r.url()).pathname}`);
    };
    page.on('response', onResponse);
    page.on('requestfailed', onFailed);
    const res = await page.goto(BASE + deep, { waitUntil: 'load' });
    await settle(page);
    page.off('response', onResponse);
    page.off('requestfailed', onFailed);
    const status = res ? res.status() : 0;
    const noindex = await page.evaluate(() => /noindex/i.test((document.querySelector('meta[name="robots"]') || {}).content || ''));
    const deepStyle = await page.evaluate(bodyStyle);
    if (status !== 404) note(c, `${deep} returned ${status}, want 404`);
    if (!noindex) note(c, `the 404 response for ${deep} has no noindex robots meta (add a 404.html with noindex)`);
    for (const f of failedCss) note(c, `stylesheet at the deep path: ${f}`);
    for (const k of Object.keys(homeStyle)) {
      if (homeStyle[k] !== deepStyle[k]) note(c, `body ${k} at the deep path differs from home: "${String(deepStyle[k]).slice(0, 50)}" vs "${String(homeStyle[k]).slice(0, 50)}"`);
    }
    c.data = { status, noindex, failedCss: failedCss.length, homeStyle, deepStyle };
    finish(c, `${deep} returns 404 with noindex; styles match the home page`);
  } finally {
    await ctx.close();
  }
});

check('10', async (c, browser) => {
  if (noPages(c)) return;
  let n = 0;
  for (const w of [390, 1280]) {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: w, height: 800 } });
    const page = await ctx.newPage();
    try {
      for (const p of S.pages) {
        await page.goto(BASE + p, { waitUntil: 'load' });
        const r = await page.evaluate(noJsFacts);
        n++;
        if (!r.navLinks) note(c, `${p} @${w}px: no primary navigation links found`);
        else if (r.reachable < r.navLinks) note(c, `${p} @${w}px: ${r.hidden.length} of ${r.navLinks} primary nav links not visible without JS: ${r.hidden.map((t) => '"' + t + '"').join(', ')}`);
        if (!r.mainText) note(c, `${p} @${w}px: main content is empty without JS`);
      }
    } finally {
      await ctx.close();
    }
  }
  c.data = { loads: n };
  finish(c, `${S.pages.length} pages at 390 and 1280 px without JS: primary nav reachable, main content present`);
});

check('11', async (c, browser) => {
  if (noPages(c)) return;
  const home = homeKey();
  let ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  let page = await ctx.newPage();
  try {
    await page.goto(BASE + home, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const anims = await page.evaluate(runningAnimations);
    for (const a of anims) note(c, `${home}: running ${a.kind} "${a.name}" ${a.duration} ms (iterations ${a.iterations}) under reduced motion`);
  } finally {
    await ctx.close();
  }
  ctx = await browser.newContext({ forcedColors: 'active', reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  try {
    await page.goto(BASE + home, { waitUntil: 'load' });
    await settle(page);
    const forced = await page.evaluate(forcedVisibility);
    for (const b of forced.bad) note(c, `${home}: ${b} has no visible border, outline or text in forced colours`);
    c.data = { forcedControls: forced.count };
  } finally {
    await ctx.close();
  }
  finish(c, `reduced motion: no animation or transition over 10 ms on load; forced colours: controls stay visible`);
});

check('12', async (c, browser) => {
  if (noPages(c)) return;
  const home = homeKey();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const bodies = new Map();
  const pending = [];
  page.on('response', (r) => {
    const t = r.request().resourceType();
    if (t !== 'stylesheet' && t !== 'script') return;
    pending.push(r.body().then((b) => bodies.set(r.url(), { type: t, text: b.toString('utf8'), bytes: b.length }), () => {}));
  });
  let dom;
  try {
    await page.goto(BASE + home, { waitUntil: 'load' });
    await settle(page);
    await Promise.all(pending);
    dom = await page.evaluate(() => {
      const head = document.head;
      return {
        headSheets: Array.from(head.querySelectorAll('link[rel~="stylesheet"]')).filter((l) => !/print/i.test(l.media)).map((l) => l.href),
        headStyles: Array.from(head.querySelectorAll('style')).map((s) => s.textContent),
        scripts: Array.from(document.querySelectorAll('script[src]')).map((s) => ({ src: s.src, blocking: !s.defer && !s.async && s.type !== 'module' })),
        inlineScripts: Array.from(document.querySelectorAll('script:not([src])')).filter((s) => !s.type || /javascript|module/.test(s.type)).map((s) => s.textContent),
      };
    });
  } finally {
    await ctx.close();
  }
  const reasons = [];
  const unread = dom.headSheets.filter((h) => !bodies.has(h));
  if (unread.length) reasons.push(`could not read ${unread.length} stylesheet(s) on the home page`);
  const sheets = dom.headSheets.map((h) => bodies.get(h)).filter(Boolean);
  const inlineCss = dom.headStyles.join('\n');
  const cssRaw = sheets.reduce((n, s) => n + s.bytes, 0) + Buffer.byteLength(inlineCss, 'utf8');
  const cssMin = sheets.reduce((n, s) => n + Buffer.byteLength(minifyEstimate(s.text), 'utf8'), 0) + Buffer.byteLength(minifyEstimate(inlineCss), 'utf8');
  const jsFiles = [...bodies.values()].filter((b) => b.type === 'script');
  const jsRaw = jsFiles.reduce((n, s) => n + s.bytes, 0) + dom.inlineScripts.reduce((n, s) => n + Buffer.byteLength(s, 'utf8'), 0);
  const blocking = dom.scripts.filter((s) => s.blocking).map((s) => s.src.replace(BASE, ''));
  c.data = { cssRawBytes: cssRaw, cssMinifiedEstimateBytes: cssMin, jsRawBytes: jsRaw, blockingScripts: blocking, cssBudgetBytes: CSS_BUDGET, jsBudgetBytes: JS_BUDGET };

  if (cssMin > CSS_BUDGET) note(c, `render-blocking CSS ≈ ${kb(cssMin)} minified (estimate; served ${kb(cssRaw)}), over the 80 KB budget`);
  if (blocking.length) note(c, `scripts without defer/async: ${blocking.join(', ')}`);
  const sizes = `render-blocking CSS ≈ ${kb(cssMin)} minified (budget 80 KB); JS ${kb(jsRaw)} as served`;
  if (jsRaw > JS_BUDGET) reasons.push(`total JS ${kb(jsRaw)} is over the 5 KB skill-JS budget, but the tool cannot tell skill JS from site JS: judge by the file list`);

  if (LIGHTHOUSE) {
    test.setTimeout(900000);
    try {
      const runs = [];
      for (let i = 1; i <= 3; i++) {
        const out = path.join(OUT, `lighthouse-${i}.json`);
        const args = [BASE + home, '--quiet', '--only-categories=performance', '--form-factor=mobile', '--output=json',
          `--output-path=${out}`, '--chrome-flags=--headless=new --no-sandbox'];
        const cmd = `${LIGHTHOUSE} ${args.map((a) => JSON.stringify(a)).join(' ')}`;
        const r = spawnSync(cmd, { shell: true, encoding: 'utf8', timeout: 300000, env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH || process.env.CHROMIUM || '' } });
        if (r.status !== 0 || !fs.existsSync(out)) throw new Error(`lighthouse run ${i} failed: ${(r.stderr || '').trim().split('\n').slice(-1)[0] || 'no output'}`);
        const j = JSON.parse(fs.readFileSync(out, 'utf8'));
        runs.push({ lcp: j.audits['largest-contentful-paint'].numericValue, performance: Math.round(j.categories.performance.score * 100) });
      }
      const median = (a) => [...a].sort((x, y) => x - y)[1];
      c.data.lighthouse = { runs, medianLcpMs: median(runs.map((r) => r.lcp)), medianPerformance: median(runs.map((r) => r.performance)) };
      reasons.push(`LCP ${Math.round(c.data.lighthouse.medianLcpMs)} ms (median of 3, mobile) needs the same page without the reference code as baseline (website.md); not compared here`);
    } catch (e) {
      reasons.push(`Lighthouse did not run: ${String(e.message).split('\n')[0]}`);
    }
  } else {
    reasons.push('LCP not measured: set LIGHTHOUSE to a lighthouse CLI path; then compare with the same page without reference code');
  }

  const lh = c.data.lighthouse;
  const lhText = lh ? `; Lighthouse median LCP ${Math.round(lh.medianLcpMs)} ms, performance ${lh.medianPerformance} (3 runs)` : '';
  c.summary = sizes + lhText;
  if (c.evidenceTotal) c.status = 'fail';
  else if (reasons.length) { c.status = 'not checked'; c.reason = reasons.join('; '); }
  else c.status = 'pass';
});

check('13', async (c) => {
  if (noPages(c)) return;
  const origins = new Set();
  for (const p of S.pageData) {
    for (const e of p.errors) note(c, `${p.key}: ${e}`);
    for (const f of p.failed) note(c, `${p.key}: failed request ${f}`);
    for (const u of new Set(p.external)) {
      try { origins.add(new URL(u).origin); } catch (e) { /* ignore */ }
      addNote(c, `${p.key}: external request ${u}`);
    }
  }
  c.data = { externalOrigins: [...origins] };
  finish(c, `${S.pageData.length} pages: no console errors, page errors or failed requests; external origins listed: ${origins.size}`);
});

// Last test: writes the outputs and sets the exit status (non-zero when any check fails).
test('report: write results.json and summary.md', async () => {
  writeOutputs();
  const failed = Array.from(results.values()).filter((c) => c.status === 'fail');
  if (failed.length) {
    throw new Error(`check-site: ${failed.length} check(s) failed: ${failed.map((c) => c.id + ' ' + c.item).join('; ')}. See ${path.join(OUT, 'summary.md')}`);
  }
});

function markdown(doc) {
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const count = (st) => doc.checks.filter((c) => c.status === st).length;
  const out = [
    '# check-site summary', '',
    `Site: \`${doc.site}\`  `,
    `Base: ${doc.base} · pages: ${doc.pages.length} · widths: ${doc.widths.join(', ')} · ${doc.seconds} s · axe: ${doc.axe ? 'yes' : 'no'} · Lighthouse: ${doc.lighthouse ? 'yes' : 'no'}`, '',
    `**Totals:** pass ${count('pass')} · fail ${count('fail')} · not checked ${count('not checked')} · not applicable ${count('not applicable')}`, '',
    '## Not checked (not a pass)', '',
  ];
  const nc = doc.checks.filter((c) => c.status === 'not checked');
  out.push(...(nc.length ? nc.map((c) => `- **${c.id} ${c.item}**: ${c.reason}`) : ['None.']), '');
  out.push('## Results', '', '| # | Review item | Check | Status | Key evidence |', '|---|---|---|---|---|');
  for (const c of doc.checks) {
    let key = c.status === 'fail' ? c.evidence[0] : (c.status === 'pass' ? c.summary : [c.summary, c.reason].filter(Boolean).join('; '));
    if (c.status === 'fail' && c.evidenceTotal > 1) key += ` (+${c.evidenceTotal - 1} more)`;
    out.push(`| ${c.id} | ${esc(c.item)} | ${esc(c.name)} | ${c.status} | ${esc(key || '')} |`);
  }
  out.push('', '## Details', '');
  for (const c of doc.checks) {
    out.push(`### ${c.id} ${c.item}: ${c.status}`, '');
    if (c.summary && c.status !== 'pass') out.push(c.summary, '');
    if (c.reason) out.push(`Reason: ${c.reason}`, '');
    for (const e of c.evidence) out.push(`- ${e}`);
    if (c.evidenceTotal > c.evidence.length) out.push(`- … ${c.evidenceTotal - c.evidence.length} more in results.json`);
    for (const n of c.notes) out.push(`- note: ${n}`);
    out.push('');
  }
  return out.join('\n') + '\n';
}

function writeOutputs() {
  fs.mkdirSync(OUT, { recursive: true });
  const checks = Array.from(results.values());
  for (const c of checks) if (!c.ran) notChecked(c, 'check did not run (see the Playwright output)');
  const counts = {};
  for (const c of checks) counts[c.status] = (counts[c.status] || 0) + 1;
  const seconds = Math.round((Date.now() - START) / 1000);
  const doc = {
    tool: 'check-site', site: SITE, base: BASE, seconds, widths: WIDTHS,
    pages: (S && S.pages) || [], axe: !!AXE, lighthouse: !!LIGHTHOUSE, counts, checks,
  };
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(doc, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'summary.md'), markdown(doc));
  console.log(`check-site: ${JSON.stringify(counts)} in ${seconds} s; summary: ${path.join(OUT, 'summary.md')}`);
}
