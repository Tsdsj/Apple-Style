# Websites

Scope: [rule strength and evidence](rules-and-evidence.md). Use this file for content websites: product and marketing pages, landing pages, documentation and blogs. Page parts are in [website-patterns.md](website-patterns.md). Rules for every web page are in [web-implementation.md](web-implementation.md). Budgets below are **project defaults**, not Apple requirements.

## Loading

- **Copy the core layers in this order:** `tokens.css`, `base.css`, `glass.css`, `controls.css`, `preferences.css`. Later files override earlier ones, so keep `preferences.css` last. Concatenate them into one stylesheet:

  ```sh
  cat tokens.css base.css glass.css controls.css preferences.css > site/css/apple-core.css
  ```

  Minify for production with any minifier. The repository's `scripts/build-css.py` generates the full and minified bundles; it is repository tooling and is not shipped with the skill.

- **What each layer gives:**
  - `tokens.css`: custom properties only (color, type scale, spacing, radius, motion). This is the stable interface. Override tokens instead of editing rules.
  - `base.css`: `class="as-body"` on `<body>` (system font, colours, background in both appearances, zero margin), type classes, shapes, readable width, and link colour and underlines for links inside running text. Without `as-body` the page keeps the browser's default font, colour and 8 px margin.
    The underline rule has zero specificity so a site can restyle it. Do not reset every link with `a { text-decoration: none }`: that also removes the underline from links in running text (WCAG 1.4.1). Links in `nav` and links with a class (such as `.as-button`) are already plain.
  - `glass.css`: materials (`.as-glass`) and the scroll edge. Glass renders with CSS alone.
  - `controls.css`: buttons (`.as-button`), form fields (`.as-form-field`, `.as-input`), pills and badges.
  - `preferences.css`: reduced motion and transparency, increased contrast, and forced colors for the core layers.

- **Add `app.css` only when a page uses an app component**: toolbar, tab bar, sidebar, sheet, menu, alert, segmented control, toggle, slider, search, list, listbox, dialog, toast, empty state or skeleton. A content website normally needs none of them. Do not use the app-only layers (`window.css`, `density.css`) on a website.

- **No runtime by default.** Layout and navigation are plain HTML. A narrow-screen menu uses `web/js/site-nav.js` (≤ 2 KB minified, no runtime dependency, loaded with `defer`; markup in `website-patterns.md`, *Narrow navigation*). Do not call `LiquidGlass.init(document)` on a site: it attaches every `.as-glass` element and wires every control on the page.

- **Optional lens (refraction).** Refraction needs `liquid-glass.js`. Load it with `defer` and attach it only to the header or one menu panel:

  ```html
  <script src="/js/liquid-glass.js" defer></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      // Deferred scripts run before DOMContentLoaded, so LiquidGlass exists here.
      LiquidGlass.attach(document.querySelector('.site-header'));
    });
  </script>
  ```

  What `attach(el, options)` does, from the runtime source:
  - It works without `init()`. It registers the element and watches its size and visibility. It does not scan the page or wire controls inside it (segmented controls, toggles, sliders).
  - It refracts only an element that already has the `.as-glass` material. It adds the lens, not the glass. Without `.as-glass`, nothing visible changes.
  - The lens is applied only in Chromium-family browsers (detected from the user agent and `backdrop-filter: url()` support). It is skipped when `data-perf="lite"` is set on `<html>`, when reduced transparency or increased contrast is requested, or when the element has `data-lens="off"`. Elsewhere the glass is the CSS material alone.
  - Options: `scale`, `rim`, `chroma`, `lens` (`false` opts out) and `adapt` (`false` skips backdrop sampling for light and dark adaptation). Leave `chroma` off: dispersion is budgeted and is for a few hero controls, not a sticky header.
  - It returns `{ detach() }`. Call `detach` when the element is removed for deterministic cleanup; the runtime also releases removed elements after a DOM mutation.

  **Cost:** `liquid-glass.js` measures about 36 KB minified (esbuild 0.25.0, 12.8 KB gzipped) at this revision. That is far above the 5 KB JS budget below. Take the lens only when the design needs it, and measure the page with and without it.

## Metadata and SEO

Every claim carries its strength. Standards: WCAG 2.2, HTML Living Standard, RFC 9309 (robots.txt), RFC 9110 (HTTP status), sitemaps.org protocol, schema.org, Open Graph protocol. Search-engine guidance is vendor documentation, not a standard, so it is labelled *official recommendation* only for that engine.

- *Official requirement* — `<html lang>` on every page, set to the page's language (`zh-Hans`, `en`). WCAG 3.1.1 Language of Page.
- *Official requirement* — every page has a `<title>` that describes its topic or purpose (WCAG 2.4.2 Page Titled). Making each title unique is a *project default*. Pattern: `Page · Site`.
- *Official recommendation* (search-engine documentation) — a `<meta name="description">` unique to each page, one or two sentences. Search engines may rewrite it.
- *Official recommendation* (search-engine documentation) — `<link rel="canonical">` with an absolute URL on every page. The link type is defined by the HTML Living Standard.
- *Project default* — Open Graph: `og:type`, `og:title`, `og:description`, `og:url`, `og:image` (absolute URL). A 1200×630 image is a common size (*observed convention*).
- *Project default* — `twitter:card` = `summary_large_image`, reusing the OG image.
- *Project default* — `<meta name="color-scheme" content="light dark">` matches `:root` in `tokens.css`. `theme-color` with two media variants: `#ffffff` for light and `#000000` for dark, the values of `--as-bg` in each appearance.
- *Project default* — favicon set: `/favicon.ico` (32×32), `/icon.svg` (scalable) and `/apple-touch-icon.png` (180×180, the size Safari uses for iPhone home-screen icons; *observed convention*).
- *Official requirement* (file format) — `/robots.txt` follows RFC 9309. It controls crawling, not indexing; use `noindex` for indexing. Add `Sitemap: https://…/sitemap.xml`.
- *Official requirement* (file format) — `/sitemap.xml` follows the sitemaps.org protocol and lists only canonical URLs. Whether to have one is a *project default*.
- *Official recommendation* (search-engine documentation) — JSON-LD (`<script type="application/ld+json">`) with schema.org types: `Organization` on the home page, `SoftwareApplication` on product pages, `Article` on posts. Describe only what the page shows: no ratings, prices or authors that are not visible.
- *Official recommendation* (RFC 9110 status semantics; search-engine documentation on soft 404s) — the 404 page returns HTTP status 404, not 200, and carries `<meta name="robots" content="noindex">`. See *Static hosting and deployment*.
- *Project default* — `viewport` must not disable zoom (`maximum-scale=1`, `user-scalable=no`). Blocking zoom works against WCAG 1.4.4 Resize Text (text must scale to 200%), and axe reports it.

Copyable `<head>` (replace the bracketed values; the theme script is in *Dark mode*):

```html
<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pricing · 青柠记账</title>
  <meta name="description" content="[one or two sentences unique to this page]">
  <link rel="canonical" href="https://example.com/pricing">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Pricing · 青柠记账">
  <meta property="og:description" content="[same as description, or a short variant]">
  <meta property="og:url" content="https://example.com/pricing">
  <meta property="og:image" content="https://example.com/social/pricing.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <script type="application/ld+json">
  {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "青柠记账", "operatingSystem": "iOS, macOS", "applicationCategory": "FinanceApplication"}
  </script>
  <link rel="stylesheet" href="/css/apple-core.css">
</head>
```

## Shared header and footer

Multi-page static sites repeat the header and footer on every page. Choose one of these:

| Option | How it works | No-JS and crawlers | Build step | Drift risk |
|---|---|---|---|---|
| 1. Static site generator (templating at build time; e.g. Eleventy, Astro) | Layouts and partials render the header and footer into each HTML file | Full HTML | Yes | Low: one source |
| 2. Tiny build step (a script that injects partials into HTML) | A short script replaces include markers and writes the output folder | Full HTML | Yes, small | Low |
| 3. Hand-copied markup plus a check script | Copy the markup; the check fails when blocks differ | Full HTML | No | Medium: the check catches drift only when it runs |
| Runtime injection (JS fetches and inserts a partial) | Page loads, then JS inserts the header | Empty without JS; links depend on rendering | No | Low, but see below |

- *Project default* — use (1) or (2) when a build is allowed. Use (3) only when build tools are forbidden, and then run the check below before every release.
- *Official recommendation* (search-engine documentation) — markup that exists in the HTML is indexed most reliably; links inserted by JS depend on rendering.
- *Project default* — avoid runtime injection for navigation. If it is used, ship the same markup in the HTML, so the page works without JS, and let the script only enhance it. Do not replace a working header with an empty placeholder.
- *Project default* — give the wrapper a fixed class (`site-header`, `site-footer`) so the check can find it, and keep each block on its own lines.

Check script for option (3) (Python 3, no dependencies). It fails when the header or footer differs between pages:

```python
import pathlib, re, sys
pattern = re.compile(r'<(?P<tag>header|footer) class="site-(?:header|footer)".*?</(?P=tag)>', re.S)
blocks = {}
for page in sorted(pathlib.Path("site").rglob("*.html")):
    for m in pattern.finditer(page.read_text(encoding="utf-8")):
        blocks.setdefault(m.group(0), []).append(str(page))
if len(blocks) != 2:  # one header and one footer, identical on every page
    sys.exit(f"{len(blocks)} distinct header/footer blocks; expected 2")
```

The check compares markup exactly, including whitespace. It does not check that a page is missing the block; add that if pages can drop it.

## Fonts

- *Official requirement* — SF fonts are licensed for Apple platform software only. Do not self-host, bundle or serve SF Pro or SF Mono as web fonts (see `typography.md`, *Fonts*).
- *Project default* — use installed names, not files. `--as-font-text` and `--as-font-display` in `tokens.css` list `-apple-system`, `BlinkMacSystemFont` and `"SF Pro"` first. Naming a font that the reader has installed is not distribution; an `@font-face` that serves a file is.
- *Project default* — `tokens.css` has no CJK faces. Override both font tokens and put the CJK faces before the generic family. A generic family must be last in the list, or the CJK faces are never reached:

  ```css
  :root {
    --as-font-text: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui,
      "PingFang SC", "Hiragino Sans", "Noto Sans CJK SC", "Microsoft YaHei",
      "Helvetica Neue", Helvetica, Arial, sans-serif;
  }
  ```

  Do the same for `--as-font-display`.
- *Observed convention* — set `lang` on the element (`zh-Hans`, `zh-Hant`, `ja`, `ko`). Browsers use it to choose regional CJK glyph forms.
- *Project default* — a brand web font is optional. CJK web fonts are large; prefer the system stack unless the design needs a brand face, and subset any font you ship.
- *Project default* — for a shipped font: `font-display: swap`, preload only the font used above the fold, and give the fallback face matching metrics so the swap does not move text. The values are measured per font, not copied:

  ```css
  @font-face { font-family: "Brand Sans"; src: url("/fonts/brand-sans.woff2") format("woff2"); font-display: swap; }
  @font-face {
    font-family: "Brand Sans fallback"; src: local("Arial");
    size-adjust: 104%; ascent-override: 90%; descent-override: 22%; line-gap-override: 0%;
  }
  body { font-family: "Brand Sans", "Brand Sans fallback", system-ui, sans-serif; }
  ```

  `<link rel="preload" href="/fonts/brand-sans.woff2" as="font" type="font/woff2" crossorigin>` goes in `<head>`.

## Dark mode

- *Project default* — follow `prefers-color-scheme` by default, with no script.
- *Project default* — the tokens use `light-dark(light, dark)`. The browser picks the value from the element's computed `color-scheme`. `:root { color-scheme: light dark }` follows the system; `:root[data-theme="light"]` and `[data-theme="dark"]` (in `tokens.css`) force one. No `@media` block is needed for each colour.
- *Project default, unverified* — browsers without `light-dark()` drop those declarations, and this project has no fallback for them. Check the target browsers before relying on the tokens.
- *Project default* — a manual switch stores the choice in `localStorage` (a per-viewer preference; wrap it in try/catch) and sets `data-theme` before first paint. Keep the script inline in `<head>`, before the stylesheet:

  ```html
  <script>
    try {
      var t = localStorage.getItem("theme");
      if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    } catch (e) {}
  </script>
  ```

- *Official recommendation* (WAI-ARIA APG, Radio Group) — offer System / Light / Dark as a radio group with a visible label, not a toggle that hides the current state.
- *Limitation* — the `theme-color` media variants follow the system setting, not the manual switch.
- *Official requirement* (WCAG 1.4.3 and 1.4.11) — measure contrast in both appearances. Re-measure any site override of `--as-accent`, `--as-action-bg` or `--as-accent-on-tint` on the real backgrounds. `tokens.css` records the measured values.

## Static hosting and deployment

- *Project default* — use root-relative asset paths (`/css/apple-core.css`). A relative path (`css/apple-core.css`) on a page at `/blog/post/` resolves under that folder and breaks. A 404 page served at a deep path breaks relative assets in the same way; the 2026-10-19 audit measured this.
- *Official recommendation* (RFC 9110 status semantics) — a missing page returns status 404. Configure the host to serve the 404 page with that status, not 200 and not a redirect to `/`. Host settings differ; check with a request to a missing path three levels deep.
- *Project default* — cache headers: HTML revalidates (`Cache-Control: no-cache`) or uses a short `max-age`. Fingerprinted assets (a hash in the file name) use `Cache-Control: public, max-age=31536000, immutable`. An un-fingerprinted stylesheet needs a short cache.
- *Project default* — compress text responses (HTML, CSS, JS, SVG, JSON) with gzip or brotli. The byte budgets in this file are minified, uncompressed sizes; transfer is smaller.
- *Project default* — serve everything over HTTPS. Add `Strict-Transport-Security` (RFC 6797) once every subdomain works over HTTPS.
- *Project default* — choose one canonical URL form (with or without a trailing slash) and redirect the other.

## Frameworks

Content sites need no runtime. Render HTML at build or on the server, and import only the core layers and the patterns the page uses.

- *Project default* — import the core stylesheet once, in the root layout (Astro, Next, Nuxt) or the entry file (Vue, Vite): `import "./apple-core.css";`. Concatenate the layers as in *Loading* if the framework needs one file.
- *Project default* — Tailwind v4: import the core stylesheet into the components layer, so utilities can still adjust it (as in `web-implementation.md`, *Stylesheet layers*):

  ```css
  @import "tailwindcss";
  @import "./apple-core.css" layer(components);
  ```

- *Project default* — map tokens into `@theme` so utilities use the same values. Tailwind v4 syntax; check your version. `inline` avoids a second layer of variables:

  ```css
  @theme inline {
    --color-accent: var(--as-accent);
    --color-action: var(--as-action-bg);
    --color-label: var(--as-label);
    --color-surface: var(--as-bg-secondary);
    --font-sans: var(--as-font-text);
    --radius-card: var(--as-radius-l);
  }
  ```

  Do not override `--spacing`: that changes every spacing utility at once. Dark mode needs no `dark:` variants, because the tokens follow `color-scheme`.
- *Project default* — if the lens or a control runtime is used, call it after mount in the browser, and detach it on unmount. Full cleanup examples are in `web-app.md`, *Runtime lifecycle and frameworks*.


## Performance budget

Project defaults. Measure the built page; do not treat these as Apple numbers.

| Budget | Limit | How to measure |
|---|---|---|
| Skill-provided CSS: core layers plus the patterns the page uses | ≤ 40 KB minified | Concatenate and minify; count bytes |
| Skill-provided JS | ≤ 5 KB minified | Minify; count bytes. The lens runtime exceeds this (see above) |
| All render-blocking CSS, including the site's own | ≤ 80 KB minified | Sum the minified bytes of every stylesheet in `<head>` |
| Scripts | `defer` on every script; none blocks first render | Markup review; Network tab |
| LCP | within 0.2 s of the same page built without the reference code | Lighthouse mobile emulation, median of three runs, same server and throttling for both builds |

**Where these numbers come from.** The project's website audit (2026-10-19, two samples, one task, Chromium, Lighthouse mobile emulation on an uncompressed local server) measured the whole stylesheet and script bundle on a page:

- About 160–190 KB more transfer per page, uncompressed.
- About 80 KB of `apple-style.css` and 41 KB of `liquid-glass.js` went unused on the home page.
- LCP 2.4–2.8 s with the bundle against 1.5–1.7 s without it, about 0.7–1.3 s slower; Lighthouse performance 86–97 against 99–100.

Those results are directional, not a benchmark.

**Current sizes at this revision** (minified bytes, measured on the repository files; re-measure after any change):

- The five core layers together: 25.2 KB. That leaves about 15 KB of the CSS budget for patterns.
- `liquid-glass.js`: about 36 KB minified (the optional lens only).

**How to measure:**

1. Build the page's stylesheet (concatenate, then minify) and count bytes. Include every pattern file the page uses.
2. Run Lighthouse in mobile emulation on the built page, three times, and take the median. Run the same command on a build without the reference code.
3. Open DevTools → Coverage on each page type. Unused bytes are the sign of copied code the page does not need.
4. In the Network tab, confirm `liquid-glass.js` loads only when the lens is used.

## Launch checklist

Each item restates a section above, where the rule strength is stated. Check the items against the built site, not the source.

- [ ] Every page: unique `<title>` and description, `lang`, canonical (*Metadata and SEO*).
- [ ] Social preview: OG and Twitter image present and absolute; check with a preview tool.
- [ ] `robots.txt` and `sitemap.xml` present; the sitemap lists only canonical URLs (*Metadata and SEO*).
- [ ] Missing URLs return 404 with the 404 page, which has `noindex` (*Static hosting and deployment*).
- [ ] Deep-path check: a missing URL three levels deep still shows styles (*Static hosting and deployment*).
- [ ] Header and footer identical on every page: build run, or check script run (*Shared header and footer*).
- [ ] No SF font files served; any brand font has fallback metrics and `font-display` (*Fonts*).
- [ ] Dark mode: no flash on load; contrast measured in both appearances (*Dark mode*).
- [ ] Caching and compression set for HTML, fingerprinted assets and text (*Static hosting and deployment*).
- [ ] Budgets in *Performance budget* met; the lens script loaded only if the page uses it.
- [ ] Keyboard, 320 px and reduced-motion checks from `web-implementation.md`, *Verify before shipping*, recorded in the Review.
- [ ] Privacy: whether to show a cookie or analytics consent banner, and what data to collect, is the site owner's legal decision. This skill gives no legal advice.
- [ ] Mainland China hosting: the host may require an ICP filing before the site is reachable. This is the site owner's responsibility; check with the host.


## Verification note: headless browsers and glass

- Headless or software-rendered Chromium does not render `backdrop-filter: blur()` of 20 px or more faithfully. Text behind large glass stays sharp in the screenshot. This was measured in the project's website audit (2026-10-19).
- So do not disable refraction, thicken fills or change materials because a headless screenshot shows sharp backgrounds.
- Confirm large glass in a browser with GPU rendering, ideally on a real device. Record the browser and GPU status in the Review report. A headless run is evidence for layout, contrast and behavior, not for how large glass looks.
