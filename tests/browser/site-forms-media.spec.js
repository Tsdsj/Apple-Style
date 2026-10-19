// Website forms, product mockups, images and video, and scroll entrance (plan 2.10, 2.12, 2.13, 2.14).
// Fixture: tests/fixtures/site-forms-media.html loads the core layers and the four pattern files, plus site-form.js.
// Chromium only; no axe (not installed). Contrast is computed from the composited colours (same method as content-patterns.spec.js).
const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8767';
const fixture = `${base}/tests/fixtures/site-forms-media.html`;

async function open(page, { width = 1280, height = 800, scheme = 'light', reduce = true } = {}) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  await page.goto(fixture);
  await page.waitForLoadState('load');
}

// Composites every ancestor background from white down, then the text colour (WCAG ratio).
async function contrastOf(page, selector, index = 0) {
  return page.evaluate(([sel, i]) => {
    const el = document.querySelectorAll(sel)[i], c = document.createElement('canvas'); c.width = c.height = 1;
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
  }, [selector, index]);
}

test.describe('website forms (2.10)', () => {
  test('the honeypot is never reached by Tab and is not in the accessibility tree', async ({ page }) => {
    await open(page);
    await page.locator('#c-message').focus();
    const seen = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      seen.push(await page.evaluate(() => document.activeElement.name || document.activeElement.id || document.activeElement.tagName));
    }
    expect(seen).not.toContain('website');
    await expect(page.getByRole('textbox', { name: 'Leave this empty' })).toHaveCount(0);
    const trap = page.locator('input[name="website"]').first();
    await expect(trap).toHaveAttribute('tabindex', '-1');
    await expect(trap).toHaveAttribute('autocomplete', 'off');
    expect(await trap.evaluate(el => !!el.closest('[aria-hidden="true"]'))).toBe(true);
    expect(await trap.evaluate(el => el.getBoundingClientRect().right <= 0)).toBe(true);
  });

  test('a filled honeypot sends nothing and shows the success text', async ({ page }) => {
    await open(page);
    let posts = 0;
    await page.route('**/contact', route => { posts++; route.fulfill({ status: 200, body: '{}' }); });
    await page.locator('#c-name').fill('Ada');
    await page.locator('#c-email').fill('ada@example.com');
    await page.locator('#c-message').fill('Hello there.');
    await page.evaluate(() => { document.querySelector('input[name="website"]').value = 'spam'; });
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#contact .as-site-form-status')).toHaveText(/Thanks/);
    expect(posts).toBe(0);
  });

  test('an empty submit moves focus to the error summary, which links to each wrong field', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    const summary = page.locator('#contact .as-site-form-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    const hrefs = await summary.locator('a').evaluateAll(els => els.map(e => e.getAttribute('href')));
    expect(hrefs).toEqual(['#c-name', '#c-email', '#c-message']);
    for (const id of ['c-name', 'c-email', 'c-message']) {
      const field = page.locator(`#${id}`);
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      const describedBy = (await field.getAttribute('aria-describedby')).split(' ');
      expect(describedBy).toContain(`${id}-error`);
      await expect(page.locator(`#${id}-error`)).toBeVisible();
      await expect(page.locator(`#${id}-error`)).toHaveText(/\S/);
    }
    // The optional organization field stays valid and unmarked.
    await expect(page.locator('#c-org')).not.toHaveAttribute('aria-invalid', 'true');
    // The status region is only for the outcome of a send, not for validation.
    await expect(page.locator('#contact .as-site-form-status')).toBeEmpty();
  });

  test('an error clears when the field is corrected and left', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    const name = page.locator('#c-name');
    await name.focus();
    await name.fill('Ada');
    await page.keyboard.press('Tab');
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#c-name-error')).toBeHidden();
  });

  test('a valid submit posts the form and shows the success message in a role=status region with focus', async ({ page }) => {
    await open(page);
    let body = '';
    await page.route('**/contact', route => { body = route.request().postData() || ''; route.fulfill({ status: 200, body: '{}' }); });
    await page.locator('#c-name').fill('Ada');
    await page.locator('#c-email').fill('ada@example.com');
    await page.locator('#c-message').fill('Hello there.');
    await page.getByRole('button', { name: 'Send message' }).click();
    const status = page.getByRole('status').filter({ hasText: 'Thanks' });
    await expect(status).toBeVisible();
    await expect(status).toBeFocused();
    await expect(status).toHaveAttribute('data-state', 'success');
    await expect(page.locator('#c-name')).toHaveValue('');
    expect(body).toContain('name="name"');
    expect(body).toContain('ada@example.com');
    expect(body).toContain('ada%40example.com'.length ? 'ada@example.com' : '');
    await expect(page.locator('#contact .as-site-form-summary')).toBeHidden();
  });

  test('a failed send shows the failure text as an error and keeps the fields', async ({ page }) => {
    await open(page);
    await page.route('**/contact', route => route.fulfill({ status: 500, body: 'no' }));
    await page.locator('#c-name').fill('Ada');
    await page.locator('#c-email').fill('ada@example.com');
    await page.locator('#c-message').fill('Hello there.');
    await page.getByRole('button', { name: 'Send message' }).click();
    const status = page.locator('#contact .as-site-form-status');
    await expect(status).toHaveText(/could not send/i);
    await expect(status).toHaveAttribute('data-state', 'error');
    await expect(page.locator('#c-name')).toHaveValue('Ada');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });

  test('required fields say so in text, and autocomplete and inputmode tokens are set', async ({ page }) => {
    await open(page);
    for (const id of ['c-name', 'c-email', 'c-message']) {
      const label = await page.locator(`label[for="${id}"]`).textContent();
      expect(label).toContain('(required)');
      await expect(page.locator(`#${id}`)).toHaveAttribute('required', '');
    }
    expect(await page.locator('label[for="c-org"]').textContent()).toContain('(optional)');
    await expect(page.locator('#c-name')).toHaveAttribute('autocomplete', 'name');
    await expect(page.locator('#c-email')).toHaveAttribute('autocomplete', 'email');
    await expect(page.locator('#c-email')).toHaveAttribute('inputmode', 'email');
    await expect(page.locator('#c-org')).toHaveAttribute('autocomplete', 'organization');
  });

  test('without JavaScript the form keeps the browser validation (novalidate is not set)', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 800 } });
    const page = await context.newPage();
    await page.goto(fixture);
    expect(await page.locator('#contact form').evaluate(f => f.noValidate)).toBe(false);
    await context.close();
  });

  test('the contact and newsletter forms do not overflow at 320 px', async ({ page }) => {
    await open(page, { width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const inline = await page.locator('#newsletter .as-site-form-inline').evaluate(el => {
      const input = el.querySelector('input').getBoundingClientRect(), button = el.querySelector('button').getBoundingClientRect();
      return { inputWidth: input.width, buttonTop: button.top, inputBottom: input.bottom };
    });
    // The field takes the full row, and the button wraps below it.
    expect(inline.inputWidth).toBeGreaterThan(250);
    expect(inline.buttonTop).toBeGreaterThanOrEqual(inline.inputBottom);
  });
});

test.describe('product mockup (2.12)', () => {
  const selectors = ['.as-site-mockup-title', '.as-site-mockup-muted', '.as-site-mockup-row > span:first-child'];

  for (const scheme of ['light', 'dark']) {
    test(`mockup text meets 4.5:1 in ${scheme}, in the readable and the aria-hidden variant`, async ({ page }) => {
      await open(page, { scheme, width: 1280 });
      for (const sel of selectors) {
        expect(await contrastOf(page, `#mock-text ${sel}`), `${sel} readable ${scheme}`).toBeGreaterThanOrEqual(4.5);
        expect(await contrastOf(page, `#mock-image ${sel}`), `${sel} hidden ${scheme}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const status of ['Paid', 'Due in 5 days', 'Overdue']) {
        const index = await page.locator('#mock-text .as-pill').evaluateAll((els, s) => els.findIndex(e => e.textContent === s), status);
        expect(await contrastOf(page, '#mock-text .as-pill', index), `pill ${status} ${scheme}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  test('the image variant is one labelled image, and its contents are hidden from assistive technology', async ({ page }) => {
    await open(page);
    const img = page.getByRole('img', { name: /Invoice list/ });
    await expect(img).toBeVisible();
    expect(await page.locator('#mock-image [aria-hidden="true"]').count()).toBe(1);
    await expect(page.locator('#mock-image').getByRole('listitem')).toHaveCount(0);
  });

  test('the mockup has no device frame or glass: its surface is a solid token colour', async ({ page }) => {
    await open(page);
    const bg = await page.locator('#mock-text').evaluate(el => getComputedStyle(el).backgroundColor);
    const backdrop = await page.locator('#mock-text').evaluate(el => getComputedStyle(el).backdropFilter);
    expect(backdrop).toBe('none');
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test('the store badge link keeps its artwork 40 px tall, unstretched, with a quarter-height clear space and no effects', async ({ page }) => {
  await open(page);
  const m = await page.locator('.as-site-store-badge img').evaluate(el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { h: r.height, ratio: r.width / r.height, natural: el.naturalWidth / el.naturalHeight, pad: parseFloat(getComputedStyle(el.parentElement).paddingTop),
      filter: cs.filter, transform: cs.transform, opacity: cs.opacity, animation: cs.animationName };
  });
  expect(m.h).toBeGreaterThanOrEqual(40);
  expect(m.pad).toBeGreaterThanOrEqual(m.h / 4);
  expect(Math.abs(m.ratio - m.natural)).toBeLessThan(0.01);
  expect(m).toMatchObject({ filter: 'none', transform: 'none', opacity: '1', animation: 'none' });
});

test.describe('images and video (2.13)', () => {
  test('every image in the fixture has width and height attributes', async ({ page }) => {
    await open(page);
    const missing = await page.locator('img').evaluateAll(els => els.filter(e => !e.hasAttribute('width') || !e.hasAttribute('height')).map(e => e.id || e.src));
    expect(missing).toEqual([]);
  });

  test('the first-screen image is not lazy and has high fetch priority; images below the fold are lazy and async', async ({ page }) => {
    await open(page);
    const lcp = await page.locator('#lcp').evaluate(el => ({ loading: el.loading, fetchpriority: el.getAttribute('fetchpriority') }));
    expect(lcp.loading).not.toBe('lazy');
    expect(lcp.fetchpriority).toBe('high');
    const lazy = await page.locator('#lazy').evaluate(el => ({ loading: el.loading, decoding: el.decoding }));
    expect(lazy).toEqual({ loading: 'lazy', decoding: 'async' });
  });

  test('the picture uses the dark source under the dark colour scheme, and the light image otherwise', async ({ page }) => {
    await open(page, { scheme: 'dark' });
    await expect.poll(() => page.locator('#lcp').evaluate(img => img.currentSrc)).toContain('hero-dark.svg');
    await open(page, { scheme: 'light' });
    await expect.poll(() => page.locator('#lcp').evaluate(img => img.currentSrc)).toContain('hero-light.svg');
  });

  test('the decorative video has a visible control that pauses and resumes it', async ({ page }) => {
    await open(page, { reduce: false });
    const video = page.locator('#loop');
    // Chromium does not start an autoplaying video that is outside the viewport, so bring it into view first.
    await video.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate(v => !v.paused)).toBe(true);
    const toggle = page.getByRole('button', { name: 'Pause video' });
    await toggle.click();
    await expect.poll(() => video.evaluate(v => v.paused)).toBe(true);
    await expect(page.getByRole('button', { name: 'Play video' })).toBeVisible();
    await page.getByRole('button', { name: 'Play video' }).click();
    await expect.poll(() => video.evaluate(v => !v.paused)).toBe(true);
  });

  test('under reduced motion the decorative video starts paused, with a control to play it', async ({ page }) => {
    await open(page, { reduce: true });
    expect(await page.locator('#loop').evaluate(v => v.paused)).toBe(true);
    await expect(page.getByRole('button', { name: 'Play video' })).toBeVisible();
  });
});

test.describe('scroll entrance (2.14)', () => {
  const reveal = page => page.locator('#reveal');

  test('under reduced motion no animation runs and the content is visible', async ({ page }) => {
    await open(page, { reduce: true });
    await reveal(page).scrollIntoViewIfNeeded();
    const count = await page.evaluate(() => document.getAnimations().filter(a => a.animationName === 'as-site-reveal').length);
    expect(count).toBe(0);
    expect(await reveal(page).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  });

  test('with motion allowed the reveal runs once and ends with the content visible', async ({ page }) => {
    await open(page, { reduce: false });
    // Before the element enters the viewport the reveal holds its start state.
    expect(await reveal(page).evaluate(el => getComputedStyle(el).opacity)).toBe('0');
    const count = await page.evaluate(() => document.getAnimations().filter(a => a.animationName === 'as-site-reveal').length);
    expect(count).toBeGreaterThan(0);
    await page.evaluate(() => { document.getElementById('reveal').scrollIntoView({ block: 'end' }); });
    await expect.poll(() => reveal(page).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  });

  test('with reduced motion the content is visible before any scrolling', async ({ page }) => {
    await open(page, { reduce: true });
    expect(await reveal(page).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  });
});
