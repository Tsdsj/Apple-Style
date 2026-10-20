// Packaged demo (plan 4.3): run scripts/prepare-demo.sh into a temp directory and serve the output under a sub-path,
// the way GitHub Pages serves a project site (https://user.github.io/Apple-Style/). Root-relative URLs in the packaged
// reference site would fail here; the rewritten relative URLs must load everything.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
const PREFIX = '/Apple-Style';
const SITE_PATH = '/skills/Apple-Style/web/examples/site/';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.mjs': 'text/javascript; charset=utf-8',
};

let tmp, pkg, server, hostOrigin, origin;

test.beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'apple-style-pages-'));
  pkg = path.join(tmp, 'site');
  execFileSync('bash', [path.join(REPO, 'scripts/prepare-demo.sh'), pkg], { stdio: 'pipe' });
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === PREFIX) {
      res.writeHead(301, { location: PREFIX + '/' });
      return res.end();
    }
    if (!url.pathname.startsWith(PREFIX + '/')) {
      res.writeHead(404, { 'content-type': TYPES['.txt'] });
      return res.end('not found');
    }
    const rel = decodeURIComponent(url.pathname.slice(PREFIX.length));
    let file = path.join(pkg, rel);
    if (rel.endsWith('/')) file = path.join(file, 'index.html');
    const inside = file.startsWith(pkg + path.sep);
    if (!inside || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': TYPES['.txt'] });
      return res.end('not found');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  hostOrigin = `http://127.0.0.1:${server.address().port}`;
  origin = hostOrigin + PREFIX;
});

test.afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(tmp, { recursive: true, force: true });
});

// Collects console errors, uncaught errors, failed requests and HTTP errors. Chromium's automatic favicon request is ignored.
function watch(page) {
  const problems = [];
  page.on('console', message => { if (message.type() === 'error') problems.push('console: ' + message.text()); });
  page.on('pageerror', error => problems.push('pageerror: ' + error.message));
  page.on('requestfailed', request => problems.push('failed: ' + request.url()));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.pathname !== '/favicon.ico' && response.status() >= 400) problems.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  return problems;
}

// Every same-host URL the page references (stylesheets, scripts, images, sources, posters, links), resolved by the browser.
// Absolute URLs to other hosts (canonical, og:image) are not fetched here.
async function localReferences(page) {
  return page.evaluate(host => {
    const urls = new Set();
    document.querySelectorAll('link[href], script[src], img[src], source[src], video[poster], video[src]').forEach(el => {
      const url = el.href || el.src || el.poster;
      if (url && url.startsWith(host)) urls.add(url);
    });
    document.querySelectorAll('img[srcset], source[srcset]').forEach(el => {
      el.getAttribute('srcset').split(',').forEach(candidate => {
        const url = new URL(candidate.trim().split(/\s+/)[0], document.baseURI).href;
        if (url.startsWith(host)) urls.add(url);
      });
    });
    return [...urls];
  }, hostOrigin);
}

async function localAnchors(page) {
  return page.evaluate(host => [...new Set(Array.from(document.querySelectorAll('a[href]'))
    .map(a => a.href).filter(url => url.startsWith(host) && !url.includes('#')))], hostOrigin);
}

test('landing page at the sub-path loads cleanly, fits a phone, and both cards navigate', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/');
  await expect(page.locator('h1')).toHaveText('先看参考网站，再看组件工作台');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  const siteCard = page.locator('[data-card=site] .card-link');
  await expect(siteCard).toHaveAttribute('href', SITE_PATH.slice(1)); // relative on purpose: it must work under /Apple-Style/
  await Promise.all([page.waitForURL(origin + SITE_PATH), siteCard.click()]);
  await expect(page.locator('h1').first()).toBeVisible();

  await page.goto(origin + '/');
  const benchCard = page.locator('[data-card=workbench] .card-link');
  await expect(benchCard).toHaveAttribute('href', 'demo/index.html');
  await Promise.all([page.waitForURL(origin + '/demo/index.html'), benchCard.click()]);
  await expect(page.locator('#shareBtn')).toBeVisible();
  expect(problems).toEqual([]);
});

test('language choice on the landing page carries over to the workbench', async ({ page }) => {
  const problems = watch(page);
  await page.goto(origin + '/');
  await page.locator('#langBtn').click();
  await expect(page.locator('h1')).toHaveText('Start with the reference website, then the component workbench');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto(origin + '/demo/index.html');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(problems).toEqual([]);
});

test('the reference site home loads every local reference and internal link under the sub-path', async ({ page }) => {
  const problems = watch(page);
  const requested = [];
  page.on('request', request => {
    if (request.url().startsWith(hostOrigin)) requested.push(request.url());
  });
  await page.goto(origin + SITE_PATH);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');

  // Every stylesheet, script, image and video reference is fetched successfully under the sub-path.
  const references = await localReferences(page);
  expect(references.length).toBeGreaterThan(10);
  for (const url of references) {
    expect(url.startsWith(origin + '/'), url).toBe(true);
    const response = await page.request.get(url);
    expect(response.status(), url).toBe(200);
  }
  const broken = await page.evaluate(() => Array.from(document.images)
    .filter(img => img.complete && img.naturalWidth === 0).map(img => img.currentSrc));
  expect(broken).toEqual([]);
  const sheets = await page.evaluate(() => Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(link => !!link.sheet));
  expect(sheets.length).toBeGreaterThan(0);
  expect(sheets.every(Boolean)).toBe(true);

  // Internal links resolve to pages (no fragment-only links, which the browser resolves on the page itself).
  for (const url of await localAnchors(page)) {
    expect(url.startsWith(origin + '/'), url).toBe(true);
    const response = await page.request.get(url);
    expect(response.status(), url).toBe(200);
  }
  expect(requested.filter(url => !url.startsWith(origin + '/'))).toEqual([]);
  expect(problems).toEqual([]);
});

test('a blog article one folder down loads its stylesheets and scripts', async ({ page }) => {
  const problems = watch(page);
  await page.goto(origin + SITE_PATH + 'blog/first-post.html');
  const sheets = await page.evaluate(() => Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(link => ({ href: link.href, loaded: !!link.sheet })));
  expect(sheets.length).toBeGreaterThan(1);
  for (const sheet of sheets) {
    expect(sheet.href.startsWith(origin + '/'), sheet.href).toBe(true);
    expect(sheet.loaded, sheet.href).toBe(true);
  }
  // A custom property from css/site.css (loaded last) is defined, so the page's own stylesheet applied.
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--as-accent').trim());
  expect(accent).not.toBe('');
  for (const url of await localReferences(page)) {
    const response = await page.request.get(url);
    expect(response.status(), url).toBe(200);
  }
  expect(problems).toEqual([]);
});
