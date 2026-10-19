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
  - `base.css`: type classes, shapes, readable width, and underlines for links inside running text.
    The underline rule has zero specificity so a site can restyle it. Do not reset every link with `a { text-decoration: none }`: that also removes the underline from links in running text (WCAG 1.4.1). Links in `nav` and links with a class (such as `.as-button`) are already plain.
  - `glass.css`: materials (`.as-glass`) and the scroll edge. Glass renders with CSS alone.
  - `controls.css`: buttons (`.as-button`), form fields (`.as-form-field`, `.as-input`), pills and badges.
  - `preferences.css`: reduced motion and transparency, increased contrast, and forced colors for the core layers.

- **Add `app.css` only when a page uses an app component**: toolbar, tab bar, sidebar, sheet, menu, alert, segmented control, toggle, slider, search, list, listbox, dialog, toast, empty state or skeleton. A content website normally needs none of them. Do not use the app-only layers (`window.css`, `density.css`) on a website.

- **No runtime by default.** Layout and navigation are plain HTML. A narrow-screen menu will use `web/js/site-nav.js` (planned, ≤ 2 KB, no runtime dependency; not yet present). Do not call `LiquidGlass.init(document)` on a site: it attaches every `.as-glass` element and wires every control on the page.

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

## Verification note: headless browsers and glass

- Headless or software-rendered Chromium does not render `backdrop-filter: blur()` of 20 px or more faithfully. Text behind large glass stays sharp in the screenshot. This was measured in the project's website audit (2026-10-19).
- So do not disable refraction, thicken fills or change materials because a headless screenshot shows sharp backgrounds.
- Confirm large glass in a browser with GPU rendering, ideally on a real device. Record the browser and GPU status in the Review report. A headless run is evidence for layout, contrast and behavior, not for how large glass looks.
