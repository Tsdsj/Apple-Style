// Reference site (plan 2.16, 2.17): skills/Apple-Style/web/examples/site.
// The site is served from its own directory on an ephemeral port by a small Node server, so its root-relative
// paths work as they would on a host. Unknown paths get 404.html with status 404, like a static host configured
// for it. axe-core is the pinned devDependency; the axe tests are skipped only if it cannot be resolved.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
const SITE = path.join(REPO, 'skills/Apple-Style/web/examples/site');
const SKILL_JS = path.join(REPO, 'skills/Apple-Style/web/js');
const KB = 1024;
const SKILL_CSS_BUDGET = 40 * KB;   // per page, minified, core layers plus patterns
const ALL_CSS_BUDGET = 80 * KB;     // per page, every stylesheet in the head, site.css included
const JS_BUDGET = 10 * KB;          // per page, raw (see README for the minified figures)
const WIDTHS = [320, 390, 768, 1280, 1920];
const PAGES = [
  '/', '/contact.html', '/privacy.html', '/blog/', '/blog/page-2.html', '/blog/tags/planning.html',
  '/blog/first-post.html', '/blog/second-post.html', '/blog/third-post.html',
];
const MISSING = '/blog/tags/no-such/deep/page/here.html';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

let server, base;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = path.join(SITE, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    const inside = file.startsWith(SITE + path.sep) || file === SITE;
    if (inside && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      return res.end(fs.readFileSync(file));
    }
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    res.end(fs.readFileSync(path.join(SITE, '404.html')));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

function axeSource() {
  try {
    return require.resolve('axe-core/axe.min.js', { paths: [REPO] });
  } catch (error) {
    return null;
  }
}

async function open(page, url, { width = 1280, scheme = 'light', reduce = true, forced = false } = {}) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({
    colorScheme: scheme, reducedMotion: reduce ? 'reduce' : 'no-preference', forcedColors: forced ? 'active' : 'none',
  });
  await page.goto(base + url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

// Scrolls to the bottom in steps so each scroll-entrance reveal finishes. Stays at the bottom: a reveal
// is scroll-linked, so returning to the top would hide blocks that have not yet entered the viewport.
async function settle(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.evaluate(v => window.scrollTo(0, v), y);
    await page.waitForTimeout(30);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
}

// Composites every ancestor background from white down, then the text colour (WCAG ratio).
async function contrastOf(page, selector) {
  return page.evaluate(sel => {
    const el = document.querySelector(sel), c = document.createElement('canvas'); c.width = c.height = 1;
    const x = c.getContext('2d', { willReadFrequently: true });
    const chain = []; for (let n = el; n; n = n.parentElement) chain.unshift(n);
    x.fillStyle = '#fff'; x.fillRect(0, 0, 1, 1);
    for (const n of chain) { x.fillStyle = getComputedStyle(n).backgroundColor; x.fillRect(0, 0, 1, 1); }
    const bg = [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
    x.fillStyle = getComputedStyle(el).color; x.fillRect(0, 0, 1, 1);
    const fg = [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
    const lum = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, k) => s + v * [.2126, .7152, .0722][k], 0);
    const [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  }, selector);
}

// Raw source of a page, as the server sends it.
async function sourceOf(request, url) {
  const response = await request.get(base + url);
  return { status: response.status(), text: await response.text() };
}

function stylesheetsOf(html) {
  return [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
}

function scriptsOf(html) {
  return [...html.matchAll(/<script src="([^"]+)"([^>]*)><\/script>/g)].map(m => ({ src: m[1], attrs: m[2] }));
}

test.describe('reference site pages (2.1–2.14)', () => {
  test('axe reports no WCAG 2.2 AA or best-practice violations on every page, in light and dark', async ({ page }) => {
    test.skip(!axeSource(), 'axe-core is not installed; run npm install');
    test.setTimeout(180000);
    for (const scheme of ['light', 'dark']) for (const url of [...PAGES, MISSING]) {
      await open(page, url, { scheme });
      await page.addScriptTag({ path: axeSource() });
      await settle(page);
      const violations = await page.evaluate(async tags => {
        const r = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
        return r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target.join(' ')) }));
      }, AXE_TAGS);
      expect(violations, `${scheme} ${url}`).toEqual([]);
    }
  });

  test('no horizontal overflow at 320, 390, 768, 1280 and 1920 px on every page', async ({ page }) => {
    test.setTimeout(180000);
    for (const url of [...PAGES, MISSING]) for (const width of WIDTHS) {
      await open(page, url, { width });
      await settle(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${url} at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test('no console errors, failed requests or external requests on any page, light and dark', async ({ page }) => {
    test.setTimeout(180000);
    for (const scheme of ['light', 'dark']) for (const url of [...PAGES, MISSING]) {
      const problems = [];
      const onRequest = request => {
        if (!request.url().startsWith(base + '/')) problems.push('external request ' + request.url());
      };
      const onResponse = response => {
        if (response.status() >= 400 && response.url() !== base + MISSING) problems.push(`HTTP ${response.status()} ${response.url()}`);
      };
      page.on('request', onRequest);
      page.on('response', onResponse);
      page.on('requestfailed', r => problems.push('failed request ' + r.url()));
      // The 404 document itself is logged by the browser as a failed load; that status is checked above.
      page.on('console', m => {
        if (url === MISSING && m.text().includes('status of 404')) return;
        if (m.type() === 'error' || m.type() === 'warning') problems.push(`console ${m.type()}: ${m.text()}`);
      });
      page.on('pageerror', e => problems.push('page error: ' + e.message));
      await open(page, url, { scheme });
      await settle(page);
      page.off('request', onRequest);
      page.off('response', onResponse);
      page.removeAllListeners('requestfailed');
      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
      expect(problems, `${scheme} ${url}`).toEqual([]);
    }
  });

  test('a deep missing path returns status 404 with the styled 404 page', async ({ page }) => {
    const response = await page.goto(base + MISSING, { waitUntil: 'load' });
    expect(response.status()).toBe(404);
    await expect(page).toHaveTitle('Page not found · Ferrule');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('h1')).toHaveText('Page not found');
    // The stylesheets resolve from the root at this depth, so the 404 page is styled.
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('h1')).fontWeight)).toBe('600');
    expect(await page.evaluate(() => document.querySelector('.as-site-404-code').getAttribute('aria-hidden'))).toBe('true');
    await expect(page.locator('.as-site-404-links a').first()).toHaveAttribute('href', '/');
  });

  test('header and footer are identical on every page, apart from aria-current', async ({ request }) => {
    const blocks = { header: new Map(), footer: new Map() };
    const pages = [...PAGES, '/404.html'];
    for (const url of pages) {
      const { status, text } = await sourceOf(request, url);
      expect(status, url).toBe(200);
      for (const tag of ['header', 'footer']) {
        const re = tag === 'header' ? /<header class="as-site-header[\s\S]*?<\/header>/ : /<footer class="as-site-footer"[\s\S]*?<\/footer>/;
        const match = text.match(re);
        expect(match, `${tag} on ${url}`).not.toBeNull();
        const normalised = match[0].replace(/ aria-current="[^"]*"/g, '');
        const key = normalised;
        if (!blocks[tag].has(key)) blocks[tag].set(key, []);
        blocks[tag].get(key).push(url);
      }
    }
    expect(blocks.header.size, 'distinct header markup').toBe(1);
    expect(blocks.footer.size, 'distinct footer markup').toBe(1);
  });

  test('aria-current marks the current section, and nothing else in the header', async ({ request }) => {
    const expected = { '/': 0, '/contact.html': 'Contact', '/privacy.html': 0, '/blog/': 'Blog', '/blog/page-2.html': 'Blog', '/blog/tags/planning.html': 'Blog', '/blog/first-post.html': 'Blog', '/blog/second-post.html': 'Blog', '/blog/third-post.html': 'Blog' };
    for (const [url, label] of Object.entries(expected)) {
      const { text } = await sourceOf(request, url);
      const header = text.match(/<header class="as-site-header[\s\S]*?<\/header>/)[0];
      const current = [...header.matchAll(/<a href="[^"]*" aria-current="page">([^<]*)<\/a>/g)].map(m => m[1]);
      expect(current, url).toEqual(label ? [label] : []);
    }
  });

  test('internal links, fragments and aria-controls targets all resolve', async ({ request }) => {
    const fileFor = urlPath => {
      const clean = urlPath.replace(/^\//, '');
      const candidates = [clean, path.posix.join(clean, 'index.html')];
      return candidates.map(c => path.join(SITE, c)).find(f => fs.existsSync(f) && fs.statSync(f).isFile()) || null;
    };
    const idsIn = file => new Set([...fs.readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    const problems = [];
    for (const url of [...PAGES, '/404.html']) {
      const { text } = await sourceOf(request, url);
      const here = fileFor(url);
      for (const m of text.matchAll(/\s(?:href|src|poster)="(\/[^"]*|#[^"]*)"/g)) {
        const [target, fragment] = m[1].split('#');
        if (target === '' ) {
          if (!idsIn(here).has(fragment)) problems.push(`${url}: missing #${fragment}`);
          continue;
        }
        const file = fileFor(target.split('?')[0]);
        if (!file) { problems.push(`${url}: missing ${target}`); continue; }
        if (fragment && file.endsWith('.html') && !idsIn(file).has(fragment)) problems.push(`${url}: missing ${target}#${fragment}`);
      }
      for (const m of text.matchAll(/aria-controls="([^"]+)"/g)) {
        if (!idsIn(here).has(m[1])) problems.push(`${url}: aria-controls ${m[1]} has no target`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('the sitemap lists only pages that exist and whose canonical URL is the same address', async ({ request }) => {
    const sitemap = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
    const locs = [...sitemap.matchAll(/<loc>https:\/\/example\.com([^<]*)<\/loc>/g)].map(m => m[1]);
    expect(locs.sort()).toEqual(PAGES.slice().sort());
    for (const loc of locs) {
      const { text } = await sourceOf(request, loc);
      expect(text, loc).toContain(`<link rel="canonical" href="https://example.com${loc}">`);
      expect(text.includes('noindex'), loc).toBe(false);
    }
  });
});

test.describe('reference site behaviour', () => {
  test('narrow menu at 390px: Enter opens, Escape closes and returns focus to the toggle', async ({ page }) => {
    await open(page, '/', { width: 390 });
    const toggle = page.locator('.as-site-nav-toggle');
    const links = page.locator('.as-site-nav-links a');
    await expect(toggle).toBeVisible();
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(links.first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect(links.first()).toBeHidden();
  });

  test('contact form: an empty submit focuses the error summary and marks each required field', async ({ page }) => {
    await open(page, '/contact.html');
    await page.getByRole('button', { name: 'Send message' }).click();
    const summary = page.locator('.as-site-form-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(summary.locator('li a')).toHaveCount(3);
    for (const id of ['c-name', 'c-email', 'c-message']) {
      await expect(page.locator('#' + id)).toHaveAttribute('aria-invalid', 'true');
    }
  });

  test('contact form: a valid submit shows the success status and clears the fields', async ({ page }) => {
    await open(page, '/contact.html');
    let posts = 0;
    await page.route('**/api/contact', route => { posts++; route.fulfill({ status: 200, body: '{}' }); });
    await page.locator('#c-name').fill('Ada Lovelace');
    await page.locator('#c-email').fill('ada@example.com');
    await page.locator('#c-message').fill('Could we move a team of five to the Team plan?');
    await page.getByRole('button', { name: 'Send message' }).click();
    const status = page.locator('.as-site-form-status');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveAttribute('data-state', 'success');
    await expect(status).toContainText('Thanks');
    await expect(status).toBeFocused();
    expect(posts).toBe(1);
    await expect(page.locator('#c-name')).toHaveValue('');
  });

  test('the newsletter form on the blog validates its single field', async ({ page }) => {
    await open(page, '/blog/');
    await page.locator('#s-email').fill('not-an-address');
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await expect(page.locator('#s-email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#s-email-error')).toBeVisible();
  });

  test('the decorative loop starts paused under reduced motion and the button toggles it', async ({ page }) => {
    await open(page, '/', { reduce: true });
    const video = page.locator('#loop');
    const button = page.locator('#loop-toggle');
    expect(await video.evaluate(v => v.paused)).toBe(true);
    await expect(button).toHaveText('Play video');
    await button.click();
    expect(await video.evaluate(v => v.paused)).toBe(false);
    await expect(button).toHaveText('Pause video');
  });

  test('the store badge placeholder is 40px tall and has no filter, transform or animation', async ({ page }) => {
    await open(page, '/');
    const badge = page.locator('.as-site-store-badge img');
    expect(await badge.evaluate(el => el.getBoundingClientRect().height)).toBe(40);
    expect(await badge.evaluate(el => {
      const s = getComputedStyle(el);
      return [s.filter, s.transform, s.animationName, s.opacity].join('|');
    })).toBe('none|none|none|1');
  });

  test('body text links are underlined and navigation links are not, on the article page', async ({ page }) => {
    await open(page, '/blog/first-post.html');
    const decorations = await page.evaluate(() => ({
      prose: getComputedStyle(document.querySelector('.as-prose p a')).textDecorationLine,
      nav: getComputedStyle(document.querySelector('.as-site-nav-links a')).textDecorationLine,
    }));
    expect(decorations.prose).toContain('underline');
    expect(decorations.nav).not.toContain('underline');
  });

  for (const scheme of ['light', 'dark']) {
    test(`brand text and button colours reach 4.5:1 in ${scheme} mode`, async ({ page }) => {
      await open(page, '/', { scheme });
      for (const selector of ['.as-site-hero-title', '.as-site-section-lead', '.as-site-plan-desc', '.as-site-footer-list a', '.as-button-filled', '.as-button-tinted', '.as-site-compare caption']) {
        const ratio = await contrastOf(page, selector);
        expect(ratio, `${scheme} ${selector}`).toBeGreaterThanOrEqual(4.5);
      }
      await open(page, '/blog/first-post.html', { scheme });
      expect(await contrastOf(page, '.as-prose p a'), `${scheme} running link`).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('the scroll reveal shows the product block after scrolling, and under reduced motion it is visible without scrolling', async ({ page }) => {
    await open(page, '/', { reduce: true });
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#product')).opacity)).toBe('1');
    await open(page, '/', { reduce: false });
    await page.locator('#product').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#product')).opacity)).toBe('1');
  });
});

test.describe('reference site budgets and sources (1.5, 2.16)', () => {
  test('skill CSS per page is at most 40 KB minified, and all CSS per page at most 80 KB', async ({ request }) => {
    const sizes = {};
    for (const url of [...PAGES, '/404.html']) {
      const { text } = await sourceOf(request, url);
      const links = stylesheetsOf(text);
      let skill = 0, all = 0;
      for (const href of links) {
        const file = path.join(SITE, href.replace(/^\//, ''));
        const bytes = fs.statSync(file).size;
        all += bytes;
        // Bundles are minified at generation time. site.css is hand-written and counted unminified.
        if (!href.endsWith('site.css')) skill += bytes;
      }
      sizes[url] = { skill, all };
      expect(skill, `${url} skill CSS`).toBeLessThanOrEqual(SKILL_CSS_BUDGET);
      expect(all, `${url} all CSS`).toBeLessThanOrEqual(ALL_CSS_BUDGET);
    }
    test.info().annotations.push({ type: 'css-bytes', description: JSON.stringify(sizes) });
  });

  test('scripts are deferred, the lens is not loaded, and JavaScript per page is within budget', async ({ request }) => {
    for (const url of [...PAGES, '/404.html']) {
      const { text } = await sourceOf(request, url);
      let raw = 0;
      for (const script of scriptsOf(text)) {
        expect(script.attrs, `${url} ${script.src}`).toContain('defer');
        expect(script.src).not.toContain('liquid-glass');
        raw += fs.statSync(path.join(SITE, script.src.replace(/^\//, ''))).size;
      }
      expect(raw, `${url} JavaScript (raw)`).toBeLessThanOrEqual(JS_BUDGET);
    }
  });

  test('the copied scripts are byte-identical to the skill sources', async () => {
    for (const name of ['site-nav.js', 'site-form.js']) {
      expect(fs.readFileSync(path.join(SITE, 'js', name))).toEqual(fs.readFileSync(path.join(SKILL_JS, name)));
    }
  });
});
