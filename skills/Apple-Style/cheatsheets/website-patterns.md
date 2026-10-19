# Website patterns

Scope: [rule strength and evidence](rules-and-evidence.md). Read [website.md](website.md) first for loading, budgets and verification.

Each pattern has a reference CSS file in `../web/patterns/` that uses tokens only. Copy the file, rename the classes if the site uses its own prefix, and keep the core layers (`tokens`, `base`, `glass`, `controls`, `preferences`) loaded. Patterns 2.1–2.3 are written below. Later patterns are added by plan items 2.4–2.14 (hero and display type, page sections, pricing tables, FAQ, article layout, lists, forms, error and legal pages, images and diagrams, scroll motion) in `docs/plan/`.

## Template

Every pattern uses these headings, in this order.

### Pattern name

- **When:** the page types and content where the pattern applies, and when it does not.
- **Structure:** the minimal HTML, with landmarks and roles.
- **Accessibility contract:** the keyboard model, focus behavior, accessible names and states the markup must provide.
- **Responsive:** what changes at 320 px, at tablet width and on wide screens.
- **Source level:** one of *official requirement*, *official recommendation*, *project default* or *observed convention* (with the date observed). An observed convention is not a requirement. Do not copy brand assets, product names or copy.
- **Verify:** the checks to run and the evidence to record, as in [Apple-Style-Review](../../Apple-Style-Review/SKILL.md).

## Site header

Reference CSS: `../web/patterns/site-header.css`. Narrow navigation: `../web/patterns/site-nav.css` and `../web/js/site-nav.js` (below).

- **When:** every content website with site navigation. Two variants:
  - **(a) Full-width bar (default).** Use it for dense navigation, many links, documentation, blogs and anything users scan. Brand on the leading side, primary links, optional one call to action.
  - **(b) Floating capsule** (`.as-site-header-floating`, with `.as-glass` on the inner element). Use it when there are few links (about five or fewer) and the page is immersive, such as a hero or media behind the header. Do not use it for dense navigation.
  - **Why the rule about bars does not decide this.** The HIG rule *don't stack custom backgrounds under bars* ([materials](materials-and-liquid-glass.md), *Liquid Glass rules* 5) is about app bars, which receive system Liquid Glass and scroll edge effects. A web page has no system bar, so variant (a) supplies its own standard material and hairline. Variant (b) is glass in the navigation layer, which the material rules allow. Audit finding W8 records that both variants are used in practice.
  - Not for a website: a bottom tab bar, or a fake window title bar (see [SKILL.md](../SKILL.md), *On a website, don't*).
- **Structure:**

  ```html
  <header class="as-site-header">
    <div class="as-site-header-inner">
      <a class="as-site-brand" href="/">Product</a>
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
  ```

  Floating variant: `<header class="as-site-header as-site-header-floating">` with `<div class="as-site-header-inner as-glass">` as the only child. Set `--as-site-header-h: 80px` on `:root` for it.

  Keep the header before `<main>`. Put the skip link before the header.
- **Accessibility contract:**
  - The current page link has `aria-current="page"`. It is also marked by weight and an underline, not by colour alone (`.as-site-nav-links a[aria-current="page"]`).
  - The header is a banner landmark only when it is outside `main`, `article` and `aside`; that is the default for this markup.
  - Links are plain `<a>` elements in a `<nav>`. Do not add `role="menubar"` or `role="menuitem"`.
  - Target size: at least 32 CSS px for pointer, 44 px with coarse input (`pointer: coarse`), a project default above WCAG 2.5.8's 24 px minimum.
  - Focus is visible (2 px accent outline, `:focus-visible`).
  - The sticky bar must not cover anchor targets: `html { scroll-padding-top: calc(var(--as-site-header-h) + 16px) }` is in the file. Set `--as-site-header-h` to the bar's total height (default 56 px). If the bar wraps to two rows (no JavaScript, narrow screens), set it to the taller value. Remove the `html` rule if the page has no sticky header.
  - Forced colors: the bar has a `CanvasText` bottom edge and the current-page link has a 2 px outline.
- **Responsive:**
  - Below 48em (768 px) the links wrap in the bar with JavaScript off; with JavaScript on they collapse behind the disclosure (see *Narrow navigation*).
  - Above 48em the gutter grows from 16 px to 20 px, and the content width is capped at `--as-site-width` (1120 px, project default).
- **Source level:** *observed convention* (apple.com-style marketing sites, observed 2026-10-19, not re-verified online in this revision; not an Apple guideline). The width, heights and material choice are *project defaults*. The sticky header, `aria-current`, the 44 px touch target (HIG *Layout*, touch target guidance) and WCAG 2.5.8 are cited in the rows above.
- **Verify:** `tests/browser/patterns.spec.js` covers the sticky position while scrolling, the scroll padding of an anchor target, the current-page marker at 1280 px, the contrast of link and brand text in light and dark, and forced colors. Check the floating variant by hand: no test covers it. Record the browser and GPU status for any screenshot of the glass.

## Narrow navigation (disclosure)

Reference CSS: `../web/patterns/site-nav.css`. Script: `../web/js/site-nav.js` (≤ 2 KB minified, no dependency on `liquid-glass.js`, loaded with `defer`).

- **When:** a site navigation with more than about three links, below 48em. Not needed when the links fit on one row at 320 px.
- **Structure:** the markup in *Site header* above. The script finds `[data-site-nav]`, its first `button[aria-controls]` and the panel with that id. The panel must be inside the `[data-site-nav]` element. The toggle has the visible text *Menu* as its accessible name.
  - Without JavaScript the toggle keeps `hidden`, and the links wrap in place below the brand.
  - When the script runs it removes `hidden`, sets `data-enhanced` on the `[data-site-nav]` element and sets `aria-expanded="false"`.
  - Tiny API for single-page apps: `SiteNav.init(root)` returns `{ destroy() }`. If the element is already enhanced, `init` returns the existing instance. `destroy()` restores the markup as it was before the script ran.
- **Accessibility contract:**
  - Enter and Space open and close the toggle (a native `<button>`). `aria-expanded` is the only state: the CSS reads it, and so does the script.
  - Escape closes the panel. Focus returns to the toggle only when focus was inside the panel or on the toggle.
  - A press outside the nav closes the panel, and so does activating a link inside it. Moving focus to an element outside the nav (Tab past the last link, or a click elsewhere) closes it without moving focus.
  - **No focus trap.** A disclosure is not a modal: the page stays reachable and the user can Tab past it. Trapping focus would be a bug in a disclosure. A full-screen overlay menu is a modal: it needs `<dialog>` (or an equivalent focus trap, `inert` on the page behind it and scroll lock), focus moving into it on open and back to the toggle on close. This pattern does not do that.
  - Not `role="menu"`. The links are navigation links. `role="menu"` promises arrow-key menu behaviour that these links do not implement. The toggle is a button with `aria-expanded`, and the list stays a list of links.
  - Nothing is applied by default that changes scrolling or the page behind the panel (no `inert`, no scroll lock).
- **Responsive:**
  - **Breakpoint: 48em (768 px), project default.** It is a literal in two places: the `max-width: 47.99em` queries in `site-nav.css` and `NARROW` in `site-nav.js`. Change both together (CSS media queries cannot read a custom property).
  - Above the breakpoint the toggle is hidden and the script closes the panel when the viewport widens (`matchMedia` change), so the links are never hidden behind a closed panel.
  - Below it the panel is a solid `--as-bg` layer under the bar, not glass. Its links are 44 px tall.
- **Motion:** the panel opens with a short fade and slide only when the user has not asked to reduce motion (`prefers-reduced-motion: no-preference`). The chevron is a shape, so open and closed do not depend on colour.
- **Source level:** the disclosure behaviour follows the WAI-ARIA APG *disclosure* pattern (official recommendation, W3C). The 48em breakpoint, the 44 px target and the solid panel are *project defaults*. The focus rules are *project defaults* based on the disclosure pattern. The modal case is a general accessibility requirement for focus, not a platform rule cited here.
- **Verify:** `tests/browser/patterns.spec.js`:
  - at 390 px, Enter opens; Tab enters the panel; Escape closes and returns focus to the toggle;
  - outside press and link activation close the panel;
  - resizing to 1280 px closes it and shows the links inline;
  - with JavaScript disabled, every link is visible inside the viewport at 390 px;
  - `destroy()` removes the listeners.

  Manual: keyboard-only pass at 390 px. Screen-reader and touch checks are not run here and stay *not checked*.

## Site footer

Reference CSS: `../web/patterns/site-footer.css`. No JavaScript.

- **When:** every content website. A sitemap for larger sites, a short legal row for small ones.
- **Structure:**

  ```html
  <footer class="as-site-footer">
    <div class="as-site-footer-inner">
      <nav class="as-site-footer-sitemap" aria-label="Sitemap">
        <div class="as-site-footer-col">
          <h2 class="as-site-footer-heading">Product</h2>
          <ul class="as-site-footer-list">
            <li><a href="/features">Features</a></li>
            <li><a href="/pricing">Pricing</a></li>
          </ul>
        </div>
      </nav>
      <div class="as-site-footer-legal">
        <p>© 2026 Example Co. Questions? <a href="/contact">Contact us</a>.</p>
        <nav aria-label="Legal">
          <ul class="as-site-footer-legal-links">
            <li><a href="/privacy">Privacy</a></li>
            <li><a href="/terms">Terms</a></li>
          </ul>
        </nav>
      </div>
    </div>
  </footer>
  ```

  Use the heading level the page outline needs (`h2` is typical). Give each `nav` its own label when there is more than one.
- **Accessibility contract:**
  - Each column is a heading followed by a list of links. A screen reader can list the columns by heading.
  - Links inside lists are not underlined. Their colour is the text colour, and they show a hover underline. WCAG 1.4.1 applies to links in running text, not to lists of links.
  - A link inside a paragraph is underlined by the core layer (`base.css`). Do not give that link a class, or it loses the underline.
  - Focus is visible.
- **Responsive:** columns stack in one column below 48em. Above it they form an `auto-fit` grid of columns at least 10rem wide. The legal row wraps. At 320 px the footer has no horizontal overflow (checked in tests). Long link text wraps (`overflow-wrap: anywhere`).
- **Trade-off, `<details>` per column:** `<details>` closes the columns on narrow screens and saves height, but it hides the links from a quick scan and from search-indexing tools that read collapsed content unevenly. The default in this pattern is stacked lists. Use `<details>` only when the sitemap is long, and then open it by default on wide screens.
- **Source level:** the sitemap-and-legal-row layout is an *observed convention* (apple.com-style marketing sites, observed 2026-10-19; not an Apple guideline). The 48em breakpoint, the 10rem column minimum and the spacing are *project defaults*. The link underline rule follows WCAG 1.4.1 (*official requirement*, W3C, WCAG 2.2).
- **Verify:** `tests/browser/patterns.spec.js` covers the 320 px overflow, the underline on list links (none) and paragraph links (underline), and the contrast of footer text in light and dark. Check the `<details>` variant by hand if used.
