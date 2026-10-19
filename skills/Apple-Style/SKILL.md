---
name: Apple-Style
description: Use when building or restyling a UI that should look and behave like Apple's platforms. Main use is websites in an Apple style: product and marketing pages, landing pages, documentation, blogs and content sites. Also web apps (HTML/CSS/JS, React, Vue, Tailwind) and, as a secondary branch, native SwiftUI, UIKit or AppKit. Covers Liquid Glass, Human Interface Guidelines compliance, system colors and type, floating navigation, sheets and menus. Also use when the user says "Apple style", "Liquid Glass", "HIG", "like iOS", "like macOS", "Cupertino", or asks whether a design follows Apple guidelines.
---

# Apple-Style

Entry point for four companion skills. This one covers composition and web implementation, starting with websites. **Apple-Style-HIG** holds the source text, **Apple-Style-Liquid-Glass** covers materials and native recipes, **Apple-Style-Review** records evidence.

## Workflow

1. **Classify the page type first** (table in `cheatsheets/rules-and-evidence.md`, section *Page type*). Read the files for that type:
   - **Content website** (product, marketing or landing page; docs; blog): `cheatsheets/website.md`, `cheatsheets/website-patterns.md`, `cheatsheets/web-implementation.md`, core layers `web/css/tokens.css`, `base.css`, `glass.css`, `controls.css`, `preferences.css`.
   - **Web app** (tool, dashboard, console, editor, admin): `cheatsheets/web-implementation.md`, `cheatsheets/web-app.md`, `cheatsheets/components-quickref.md`, `web/demo.html`, the core layers plus `web/css/app.css`, `density.css`, `app-preferences.css`; `window.css` only for split panes.
   - **Deliberate Mac-like window** (the user asked for a Mac look): `web/demo-desktop.html`, `cheatsheets/layout-and-shapes.md`, `cheatsheets/web-app.md` (window section), the web app files, and `web/css/window.css`.
   - **Native** (SwiftUI, UIKit, AppKit): the HIG reference in `../Apple-Style-HIG/reference/INDEX.md` and the native recipe in `../Apple-Style-Liquid-Glass/SKILL.md`. Do not read web files for this type.

   Identify target platform, application type, input and available container separately. Preserve existing product conventions and the user's current stage.
2. Classify content and navigation/control layers. Use standard components and semantic colors; use glass where the platform guidance supports it. A web page does not automatically become a native window.
3. Load other cheatsheets only as needed (color, typography, layout, motion, accessibility). For material work read `cheatsheets/materials-and-liquid-glass.md`.
4. When a number or recommendation matters, check the applicable section in `../Apple-Style-HIG/reference/` and its provenance in `sources.json`. Label each claim as an official requirement, official recommendation, project default or visual heuristic.
5. Implement within the authorized scope. Web assets need no runtime dependencies or build step: copy only the layers you use.
6. Verify the relevant states and record checked / not checked / not applicable, with evidence, using **Apple-Style-Review**. Do not infer test passes from a textual review.

## On a website, don't

- Put an iOS-style floating bottom tab bar in place of site navigation. Use a header; on narrow screens use a disclosure menu.
- Draw a fake OS window, title bar or menu bar around the page.
- Put glass on content: cards, articles, tables, forms. Glass belongs to the navigation layer (header, floating controls).
- Ship the whole `apple-style.css` or `liquid-glass.js` to a content site. Copy the core layers and the patterns the page uses.

## Composition defaults

- Keep a clear content/control hierarchy. Regular glass on floating navigation and controls; content on solid backgrounds or standard materials. Avoid glass nested in glass. Platform exceptions come from the source, not a universal prohibition.
- Use semantic label, background, separator and action colors. System color samples are not contrast guarantees: ordinary text needs 4.5:1 in default light and dark states. White-text buttons and selected rows use `--as-action-bg` / `--as-action-fg`. If a custom or brand tint fails, override `--as-accent`, `--as-action-bg` and `--as-accent-on-tint`, then re-measure over the actual backdrop.
- Use concentric radii for nested shapes. Capsules suit touch controls; dense Mac controls can use rounded rectangles. Spacing, pane widths and corner sizes in the CSS are project defaults.
- Choose density from product intent, not viewport width. Websites keep the default density. Desktop web apps set `data-density="desktop"` on `<html>` (project default). `data-platform="macos"` is an explicit choice for a Mac-like surface. Sidebars, inspectors and menus are optional.
- Keep click and keyboard activation when adding drag. Respect disabled state, cancellation, focus and ARIA. Reduce Motion removes elastic movement; avoid decorative bounce.
- Prefer monochrome navigation icons and restrained tint. Keep borders or brand colors where they are needed for contrast, grouping or an existing design system.
- Native targets use system components and semantic APIs first. Web assets do not ship SF fonts or SF Symbols, and websites must not self-host SF fonts.

## Website quick start

Concatenate the five core layers (`cheatsheets/website.md`, *Loading*) and copy the pattern files you use. Add `site-nav.js` with `defer` only for a disclosure menu. No other script is loaded.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Product name: short description</title>
  <link rel="stylesheet" href="/css/apple-core.css">
  <link rel="stylesheet" href="/css/site-header.css">
  <link rel="stylesheet" href="/css/site-nav.css">
  <link rel="stylesheet" href="/css/site-footer.css">
  <script src="/js/site-nav.js" defer></script>
</head>
<body class="as-body">
  <a href="#main">Skip to content</a>
  <header class="as-site-header">
    <div class="as-site-header-inner">
      <a class="as-site-brand" href="/">Product name</a>
      <nav class="as-site-nav" data-site-nav aria-label="Primary">
        <button class="as-site-nav-toggle" type="button" aria-controls="site-links" aria-expanded="false" hidden>Menu</button>
        <ul class="as-site-nav-links" id="site-links">
          <li><a href="/features">Features</a></li>
          <li><a href="/pricing" aria-current="page">Pricing</a></li>
        </ul>
      </nav>
      <a class="as-button as-button-filled as-button-small" href="/signup">Get started</a>
    </div>
  </header>
  <main id="main">
    <h1>Headline</h1>
  </main>
  <footer class="as-site-footer">…</footer>
</body>
</html>
```

The skip link must be visible on focus; style it in the site CSS.

## Web app quick start

```html
<link rel="stylesheet" href="apple-style.css">
<main id="app">
  <button class="as-button as-button-filled">Save</button>
  <div class="as-segmented" role="radiogroup" aria-label="Map style">
    <button class="as-segment is-selected" role="radio" aria-checked="true">Map</button>
    <button class="as-segment" role="radio" aria-checked="false">Transit</button>
  </div>
  <button class="as-toggle" role="switch" aria-checked="true" aria-label="Wi-Fi">
    <span class="as-knob"></span>
  </button>
  <input class="as-slider" type="range" aria-label="Volume">
</main>
<script src="liquid-glass.js"></script>
<script>
  const runtime = LiquidGlass.init(document.querySelector('#app'));
  // Before removing this application surface: runtime.destroy();
</script>
```

- `tablist` only for switching panels, with `aria-controls` on each tab; `<nav>` links for navigation. Listen for `change`; do not add a second state-toggle click handler.
- Forms: `web-implementation.md` (*Forms*). Lists, dialogs, toasts and states: `web-app.md` (*States*, *Selectable lists and toasts*). Components: `components-quickref.md`.
- Bundlers import `web/liquid-glass.mjs` and call `init` after mount. `init(root)`, `destroy(root)` and `detach(el)` manage lifecycle; framework cleanup is in `web-app.md` (*Runtime lifecycle and frameworks*).
- `.as-window`, `.as-split` and `.as-inspector` only where the task needs them.

## Files

- `cheatsheets/`: topic references; `rules-and-evidence.md` (page types, evidence); `website*.md` (websites); `web-implementation.md`, `web-app.md` and `components-quickref.md` (web).
- `web/css/*.css`: stylesheet sources. Core layers, in cascade order: `tokens`, `base`, `glass`, `controls`, `preferences`. App-only layers: `app`, `window`, `density`, `app-preferences`.
- `web/apple-style.css`, `web/apple-style.min.css`: all layers, generated from `web/css/` by `scripts/build-css.py` in the repository. Edit the sources, not these files. Websites should not use them.
- `web/liquid-glass.js`, `web/liquid-glass.mjs`: runtime (classic script, and ES module entry). Web apps use it; websites only for optional lens.
- `web/js/site-nav.js`: narrow-screen disclosure menu (≤ 2 KB), loaded with `defer`.
- `web/patterns/*.css`: one reference file per website pattern, tokens only.
- `web/demo.html`, `web/demo-desktop.html`: examples for web apps and the Mac-like window.
- `scripts/hig-lookup.sh`: search local references. `scripts/update-reference.sh`: transactional, manifest-backed refresh.
- Repository only, not installed with the skill: [validation commands and evidence](https://github.com/Tsdsj/Apple-Style/blob/main/docs/validation.md) and the [demo index](https://github.com/Tsdsj/Apple-Style/blob/main/demo/index.html).
