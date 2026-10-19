// Content website patterns (plan 2.4–2.9): hero, sections and cards, pricing and comparison,
// FAQ, article prose, blog list, breadcrumb, pagination and tags.
// Fixture: tests/fixtures/site-content.html loads the core layers, the header, nav and footer, and the six pattern files.
// Chromium only; no axe (not installed). Contrast is computed from the composited colours (same method as patterns.spec.js).
const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8767';
const fixture = `${base}/tests/fixtures/site-content.html`;

async function open(page, { width = 1280, height = 800, scheme = 'light', forced = false, reduce = true } = {}) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({
    colorScheme: scheme, reducedMotion: reduce ? 'reduce' : 'no-preference', forcedColors: forced ? 'active' : 'none',
  });
  await page.goto(fixture);
  await page.waitForFunction(() => window.SiteNav !== undefined && document.readyState === 'complete');
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

const style = (page, sel, pseudo) => page.locator(sel).first().evaluate((el, p) => {
  const s = getComputedStyle(el, p || null);
  // Bottom borders are read too: table cells and FAQ rows draw their rules with border-block-end.
  return { underline: s.textDecorationLine, weight: s.fontWeight, shadow: s.boxShadow, transition: s.transitionDuration,
    borderWidth: s.borderTopWidth, borderStyle: s.borderTopStyle, borderColor: s.borderTopColor,
    bottomStyle: s.borderBottomStyle, bottomColor: s.borderBottomColor, color: s.color,
    overflowX: s.overflowX, fontSize: s.fontSize, wordBreak: s.wordBreak, lineBreak: s.lineBreak, textWrap: s.textWrapStyle || s.textWrap };
}, pseudo);

test.describe('hero and display type (2.4)', () => {
  test('the headline font size grows from 390 to 1280 px and stays inside the clamp bounds (40 to 80 px)', async ({ page }) => {
    await open(page, { width: 390 });
    const at = async width => { await page.setViewportSize({ width, height: 800 }); return (await style(page, '#top .as-site-hero-title')).fontSize; };
    const small = parseFloat(await at(390));
    const large = parseFloat(await at(1280));
    expect(large).toBeGreaterThan(small);
    expect(small).toBeGreaterThanOrEqual(40);
    expect(large).toBeLessThanOrEqual(80);
    expect(large).toBeCloseTo(80, 0);
    expect(parseFloat(await at(320))).toBeGreaterThanOrEqual(40);
  });

  test('the headline uses text-wrap balance and the subhead uses pretty', async ({ page }) => {
    await open(page, { width: 390 });
    expect((await style(page, '#top .as-site-hero-title')).textWrap).toBe('balance');
    expect((await style(page, '#top .as-site-hero-sub')).textWrap).toBe('pretty');
  });

  test('CJK hero uses auto-phrase and strict line breaks under lang zh, and the fallback elsewhere', async ({ page }) => {
    await open(page);
    const zh = await style(page, '#zh-hero .as-site-hero-title');
    expect(zh.wordBreak).toBe('auto-phrase');
    expect(zh.lineBreak).toBe('strict');
    const en = await style(page, '#top .as-site-hero-title');
    expect(en.wordBreak).toBe('normal');
  });

  test('white text over the overlay image meets 4.5:1 on the scrim composited over pure white (the worst case)', async ({ page }) => {
    await open(page);
    const ratio = await page.evaluate(() => {
      const hero = document.getElementById('overlay');
      const scrim = getComputedStyle(hero, '::before').backgroundColor;   // e.g. rgba(0, 0, 0, 0.6)
      const text = getComputedStyle(hero.querySelector('.as-site-hero-title')).color;
      // Canvas composites the scrim over white (the worst case: a white image behind it).
      const c = document.createElement('canvas'); c.width = c.height = 1;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1, 1);
      x.fillStyle = scrim; x.fillRect(0, 0, 1, 1);
      const composed = [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1, 1);
      x.fillStyle = text; x.fillRect(0, 0, 1, 1);
      const fg = [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
      const lum = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, k) => s + v * [.2126, .7152, .0722][k], 0);
      const [a, b] = [lum(fg), lum(composed)];
      return { ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), scrim, composed };
    });
    expect(ratio.ratio, JSON.stringify(ratio)).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('sections, cards and the header edge (2.5)', () => {
  test('section content lines up with the header brand at 1280 px', async ({ page }) => {
    await open(page, { width: 1280 });
    const brand = await page.locator('.as-site-brand').evaluate(el => el.getBoundingClientRect().left + 0);
    const title = await page.locator('#features .as-site-section-title').evaluate(el => el.getBoundingClientRect().left);
    // The brand sits in the header's padding box, the same width as the section's content, so both start at the same x.
    expect(Math.abs(title - brand)).toBeLessThanOrEqual(1);
  });

  test('the feature grid has equal card heights and wraps to one column at 320 px', async ({ page }) => {
    await open(page, { width: 320, height: 700 });
    const widths = await page.locator('.as-site-card').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().width)));
    expect(new Set(widths).size).toBe(1);
    expect(widths[0]).toBeLessThanOrEqual(288);
    await open(page, { width: 1280 });
    const tops = await page.locator('.as-site-card').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });
});

test.describe('pricing and comparison (2.6)', () => {
  test('the recommended plan differs from the others by border width and a text badge, not only colour', async ({ page }) => {
    await open(page, { width: 1280 });
    const rec = await style(page, '.as-site-plan-recommended');
    const other = await style(page, '.as-site-plan:not(.as-site-plan-recommended)');
    expect(rec.borderWidth).not.toBe(other.borderWidth);
    expect(parseFloat(rec.borderWidth)).toBeGreaterThan(parseFloat(other.borderWidth));
    const badges = await page.locator('.as-site-plan-flag').allTextContents();
    expect(badges).toEqual(['Recommended']);
    await expect(page.locator('.as-site-plan-recommended .as-site-plan-flag')).toHaveText('Recommended');
  });

  test('the comparison table has a caption, scoped headers and marks with visually hidden text', async ({ page }) => {
    await open(page, { width: 1280 });
    const table = page.getByRole('table', { name: 'Compare plans' });
    await expect(table).toBeVisible();
    expect(await page.locator('.as-site-compare caption').textContent()).toBe('Compare plans');
    expect(await page.locator('.as-site-compare thead th[scope="col"]').count()).toBe(4);
    expect(await page.locator('.as-site-compare tbody th[scope="row"]').count()).toBe(3);
    const marks = page.locator('.as-site-compare .as-site-mark');
    const count = await marks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(marks.nth(i)).toHaveAttribute('aria-hidden', 'true');
      const cell = await marks.nth(i).evaluate(el => el.closest('td').textContent.trim());
      expect(cell).toMatch(/^(Included|Not included)$|^[\s–✓]*(Included|Not included)$/);
    }
    const hidden = page.locator('.as-site-compare .as-sr-only').first();
    const box = await hidden.boundingBox();
    expect(box.width).toBeLessThanOrEqual(1);
  });

  test('at 320 px the table scrolls inside its region, the page does not, and the region takes keyboard focus', async ({ page }) => {
    await open(page, { width: 320, height: 700 });
    const region = page.locator('.as-site-compare-region');
    const numbers = await region.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(numbers.scroll).toBeGreaterThan(numbers.client);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await page.locator('#pricing .as-site-plan').last().locator('a').focus();
    await page.keyboard.press('Tab');
    await expect(region).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  });

  test('the first column stays in view while the table scrolls', async ({ page }) => {
    await open(page, { width: 320, height: 700 });
    const region = page.locator('.as-site-compare-region');
    await region.evaluate(el => { el.scrollLeft = 200; });
    const headerLeft = await page.locator('.as-site-compare tbody th[scope="row"]').first().evaluate(el => el.getBoundingClientRect().left);
    const regionLeft = await region.evaluate(el => el.getBoundingClientRect().left);
    expect(Math.abs(headerLeft - regionLeft)).toBeLessThanOrEqual(2);
  });
});

test.describe('FAQ disclosure (2.7)', () => {
  test('Enter on a summary toggles the item', async ({ page }) => {
    await open(page);
    const item = page.locator('.as-site-faq-item').first();
    const summary = item.locator('summary');
    await summary.focus();
    await expect(item).not.toHaveAttribute('open', '');
    await page.keyboard.press('Enter');
    await expect(item).toHaveAttribute('open', '');
    await page.keyboard.press('Enter');
    await expect(item).not.toHaveAttribute('open', '');
  });

  test('the chevron has no transition under reduced motion and does under no preference', async ({ page }) => {
    await open(page, { reduce: true });
    expect((await style(page, '.as-site-faq-item > summary', '::after')).transition).toBe('0s');
    await open(page, { reduce: false });
    expect((await style(page, '.as-site-faq-item > summary', '::after')).transition).not.toBe('0s');
  });

  test('the summary has a visible focus ring and a target of at least 44 px', async ({ page }) => {
    await open(page, { width: 390 });
    const summary = page.locator('.as-site-faq-item > summary').first();
    await summary.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    expect((await summary.boundingBox()).height).toBeGreaterThanOrEqual(44);
    const outline = await summary.evaluate(el => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth]; });
    expect(outline[0]).toBe('solid');
    expect(parseFloat(outline[1])).toBeGreaterThanOrEqual(2);
  });
});

test.describe('article prose (2.8)', () => {
  test('a prose link is underlined, while nav, breadcrumb, pagination and tag links are not', async ({ page }) => {
    await open(page);
    expect((await style(page, '.as-prose p a')).underline).toBe('underline');
    expect((await style(page, '.as-site-nav-links a')).underline).toBe('none');
    expect((await style(page, '.as-site-breadcrumb a')).underline).toBe('none');
    expect((await style(page, '.as-site-pagination a')).underline).toBe('none');
    expect((await style(page, '.as-site-tags a')).underline).toBe('none');
  });

  test('a long code line scrolls inside its pre, not the page', async ({ page }) => {
    await open(page, { width: 390 });
    const pre = page.locator('.as-prose pre');
    const numbers = await pre.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth, overflowX: getComputedStyle(el).overflowX }));
    expect(numbers.overflowX).toBe('auto');
    expect(numbers.scroll).toBeGreaterThan(numbers.client);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('the Latin measure is at most 75ch at 1280 px', async ({ page }) => {
    await open(page, { width: 1280 });
    const result = await page.locator('.as-prose').first().evaluate(el => {
      const probe = document.createElement('span');
      probe.textContent = '0'.repeat(100);
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
      el.appendChild(probe);
      const ch = probe.getBoundingClientRect().width / 100;
      probe.remove();
      return { width: el.getBoundingClientRect().width, ch };
    });
    expect(result.width / result.ch).toBeLessThanOrEqual(75);
    expect(result.width / result.ch).toBeGreaterThanOrEqual(55);
  });

  test('the zh-Hans article is at most 40em wide', async ({ page }) => {
    await open(page, { width: 1280 });
    const result = await page.locator('.as-prose:lang(zh)').evaluate(el => ({ width: el.getBoundingClientRect().width, size: parseFloat(getComputedStyle(el).fontSize) }));
    expect(result.width).toBeLessThanOrEqual(40 * result.size + 1);
  });
});

test.describe('blog list, breadcrumb, pagination and tags (2.9)', () => {
  test('the current breadcrumb item and the current page are marked by aria-current and by weight or a ring', async ({ page }) => {
    await open(page);
    const crumb = page.locator('.as-site-breadcrumb [aria-current="page"]');
    await expect(crumb).toHaveText('Start with a plan');
    const crumbStyle = await style(page, '.as-site-breadcrumb [aria-current="page"]');
    const linkStyle = await style(page, '.as-site-breadcrumb a');
    expect(crumbStyle.weight).not.toBe(linkStyle.weight);
    const page2 = page.locator('.as-site-pagination [aria-current="page"]');
    await expect(page2).toHaveText('2');
    const pageStyle = await style(page, '.as-site-pagination [aria-current="page"]');
    expect(pageStyle.shadow).not.toBe('none');
    expect(pageStyle.weight).toBe('600');
    const tag = await style(page, '.as-site-tags [aria-current="true"]');
    expect(tag.shadow).not.toBe('none');
  });

  test('the post summary stays selectable and is not the card link', async ({ page }) => {
    await open(page);
    const hit = await page.locator('.as-site-post').first().evaluate(card => {
      card.scrollIntoView({ block: 'center' });
      const summary = card.querySelector('.as-site-post-summary');
      const r = summary.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + 8, r.top + 8);
      return { onSummary: summary.contains(top), userSelect: getComputedStyle(summary).userSelect };
    });
    expect(hit.onSummary).toBe(true);
    expect(hit.userSelect).not.toBe('none');
  });

  test('the post title link covers the whole card', async ({ page }) => {
    await open(page);
    const covers = await page.locator('.as-site-post').first().evaluate(card => {
      card.scrollIntoView({ block: 'center' });
      const r = card.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height - 6);
      return !!top && !!top.closest('.as-site-post') && top.closest('.as-site-post') === card && card.querySelector('.as-site-post-link') !== null;
    });
    expect(covers).toBe(true);
  });
});

test.describe('contrast in light and dark (4.5:1)', () => {
  const targets = [
    ['.as-prose p', 0], ['.as-prose figcaption', 0], ['.as-site-card p', 0], ['.as-site-compare td', 0],
    ['.as-site-compare caption', 0], ['.as-site-tags a', 0], ['.as-site-post-summary', 0], ['.as-site-post-meta', 0],
    ['.as-site-faq-answer p', 0], ['.as-site-plan-desc', 0], ['.as-site-hero-sub', 0], ['.as-site-eyebrow', 0],
    ['.as-site-breadcrumb a', 0], ['.as-site-mark-no', 0], ['.as-prose blockquote', 0], ['.as-prose-table caption', 0],
  ];
  for (const scheme of ['light', 'dark']) {
    test(`body text, captions, card text, table text and tag text meet 4.5:1 in ${scheme}`, async ({ page }) => {
      await open(page, { scheme, width: 1280 });
      for (const [sel, i] of targets) {
        expect(await contrastOf(page, sel, i), `${sel} in ${scheme}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

test.describe('forced colors (Windows High Contrast)', () => {
  test('the recommended-plan border and the table rules stay visible', async ({ page }) => {
    await open(page, { width: 1280, forced: true });
    const rec = await style(page, '.as-site-plan-recommended');
    expect(rec.borderStyle).toBe('solid');
    expect(rec.borderColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(parseFloat(rec.borderWidth)).toBeGreaterThanOrEqual(2);
    const cell = await style(page, '.as-site-compare td');
    expect(cell.bottomStyle).toBe('solid');
    expect(cell.bottomColor).not.toBe('rgba(0, 0, 0, 0)');
    await expect(page.locator('.as-site-plan-recommended .as-site-plan-flag')).toBeVisible();
  });
});
