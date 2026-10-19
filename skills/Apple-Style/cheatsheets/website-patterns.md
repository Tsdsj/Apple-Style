# Website patterns

Scope: [rule strength and evidence](rules-and-evidence.md). Read [website.md](website.md) first for loading, budgets and verification.

Each pattern has a reference CSS file in `../web/patterns/` that uses tokens only. Copy the file, rename the classes if the site uses its own prefix, and keep the core layers (`tokens`, `base`, `glass`, `controls`, `preferences`) loaded. Patterns 2.1–2.14 are written below: header, narrow navigation, footer, hero and display type, section rhythm and feature grid, pricing and comparison, FAQ, article prose, blog list with breadcrumb, pagination and tags, website forms, 404 and legal pages, product imagery and mockups (with the App Store badge), images and media, and scroll entrance. The reference site in `../web/examples/site/` combines all of them on real pages (home, blog, article, contact, privacy and 404), with the CSS bundles, the byte budget and the checks described in its README.

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

  Keep the header before `<main>`. Put the skip link before the header. Reset the body margin (`body { margin: 0 }`): the default 8 px margin stops a sticky bar from reaching the viewport edges, and the reference fixtures reset it.
- **Accessibility contract:**
  - The current page link has `aria-current="page"`. It is also marked by weight and an underline, not by colour alone (`.as-site-nav-links a[aria-current="page"]`).
  - The header is a banner landmark only when it is outside `main`, `article` and `aside`; that is the default for this markup.
  - Links are plain `<a>` elements in a `<nav>`. Do not add `role="menubar"` or `role="menuitem"`.
  - Target size: at least 32 CSS px for pointer, 44 px with coarse input (`pointer: coarse`), a project default above WCAG 2.5.8's 24 px minimum.
  - Focus is visible (2 px accent outline, `:focus-visible`).
  - The sticky bar must not cover anchor targets: `html { scroll-padding-top: calc(var(--as-site-header-h) + 16px) }` is in the file. Set `--as-site-header-h` to the bar's total height (default 56 px). If the bar wraps to two rows (no JavaScript, narrow screens), set it to the taller value. Remove the `html` rule if the page has no sticky header.
  - Forced colors: the bar has a `CanvasText` bottom edge and the current-page link has a 2 px outline.
  - The brand may wrap (`min-inline-size: 0`), so a long name cannot widen the page.
- **Responsive:**
  - Below 48em (768 px) the links wrap in the bar with JavaScript off; with JavaScript on they collapse behind the disclosure (see *Narrow navigation*).
  - Below 30em (480 px) the gaps and the type of the brand, the Menu toggle and the small CTA are tighter, so the brand, Menu and CTA fit on one row at 320 px (288 px of content) with room for other fonts. A long brand name, a long CTA label or a large text setting can still move the CTA to a second row. Reflow (WCAG 1.4.10) allows that; then set `--as-site-header-h` to the taller height.
  - Above 48em the gutter grows from 16 px to 20 px, and the content width is capped at `--as-site-width` (1120 px, project default).
- **Source level:** *observed convention* (apple.com-style marketing sites, observed 2026-10-19, not re-verified online in this revision; not an Apple guideline). The width, heights and material choice are *project defaults*. The sticky header, `aria-current`, the 44 px touch target (HIG *Layout*, touch target guidance) and WCAG 2.5.8 are cited in the rows above.
- **Verify:** `tests/browser/patterns.spec.js` covers the sticky position while scrolling, the scroll padding of an anchor target, the brand, Menu and CTA on one row at 320, 360 and 390 px (with JavaScript), the current-page marker at 1280 px, the contrast of link and brand text in light and dark, and forced colors. Check the floating variant by hand: no test covers it. Record the browser and GPU status for any screenshot of the glass.

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
  - **No layout shift when the script runs (floating variant).** Without JavaScript the links wrap onto a second row below the breakpoint, and the script moves them behind the Menu button. A floating capsule keeps a 92 px inner height below 48em (114 px below 23.75em, where the links wrap to two rows), so the header has the same height with and without JavaScript. Without this the page below moved by about 24 to 34 px when `site-nav.js` ran (Lighthouse layout shift 0.22 on the reference site). Set `--as-site-header-h` to the total height of the header in each range. The rules are in `../web/patterns/site-header.css`; the measured shift after the change is 0.01 to 0.02 at 320 to 412 px.
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

## Hero and display type

Reference CSS: `../web/patterns/hero.css`. The type scale is the one in [typography.md](typography.md), *Web display type*.

- **When:** the first screen of a marketing or product page. Use the split variant (`.as-site-hero-split`: text beside media from 64em, media below the text on narrower screens) by default. Use the overlay variant (`.as-site-hero-overlay`: text over a full-bleed image) only when the image is made for it and the text can sit on the scrim. Not for article headers (use [article prose](#article-prose)), not for dense information, not for a carousel.
- **Structure:**

  ```html
  <section class="as-site-hero as-site-hero-split" aria-labelledby="hero-title">
    <div class="as-site-hero-body">
      <p class="as-site-eyebrow">New in 2026</p>
      <h1 class="as-site-hero-title" id="hero-title">Plan the work. Ship it on time.</h1>
      <p class="as-site-hero-sub">A short subhead that says what the product does.</p>
      <div class="as-site-hero-actions">
        <a class="as-button as-button-filled as-button-large" href="/signup">Get started</a>
        <a class="as-button as-button-tinted as-button-large" href="/tour">Read the guide</a>
      </div>
    </div>
    <figure class="as-site-hero-media">
      <img src="/img/product.webp" width="1200" height="900" alt="">
    </figure>
  </section>
  ```

  Overlay: `<section class="as-site-hero as-site-hero-overlay">`, with the `<img>` as its first child (`alt=""` when decorative) and the text inside `.as-site-hero-body`. The scrim is a pseudo-element, so no extra markup is needed. Use one `h1` per page; the overlay headline is an `h2` if the page already has an `h1`.
- **Accessibility contract:**
  - The headline is a heading of the page outline. It has `text-wrap: balance`; subheads have `text-wrap: pretty` (progressive: browsers without them wrap as usual).
  - Text over an image needs at least 4.5:1 for normal text (WCAG 1.4.3, official requirement). The overlay's scrim is `rgb(0 0 0 / .6)`. Over any backdrop, each composited channel is at most 255 × 0.4 = 102, so white text is at least 5.7:1. That bound holds only where the scrim covers the text, so the overlay scrim covers the whole hero. A different image needs no new check because the scrim sets the worst case, but a different scrim (for example a gradient that is lighter at the text) must be measured on the real image and on pure white.
  - Decorative images have `alt=""`. An informative image gets a text alternative in `alt`.
  - Forced colours: the overlay image and scrim are hidden and the text takes the system colours.
  - CJK (`lang` zh or ja): `word-break: auto-phrase` and `line-break: strict` apply to the headline and subhead. Other browsers keep `normal` (project default; typography.md, *Web display type*). Do not use `word-break: keep-all` for Chinese body text.
  - The eyebrow is text. It is not a visual-only decoration with no meaning.
- **Responsive:**
  - Headline size is `var(--as-display-1)`: `clamp(2.5rem, 1.5rem + 4.5vw, 5rem)`, about 40 to 80 px. It is relative to the reader's font size, so browser text settings still apply.
  - At 320 px the headline is 40 px. `overflow-wrap: break-word` stops a long word from widening the page.
  - The split layout starts at 64em (1024 px). Below it the media follows the text. The actions wrap.
  - The gutter is 16 px, and 20 px from 48em.
- **Source level:** the type numbers are *project default* taken from typography.md (*visual heuristic* for the sizes themselves). The split and overlay layouts are *observed convention* (apple.com-style marketing pages, observed 2026-10-19, not re-verified online in this revision). `text-wrap` is *project default* with progressive enhancement. `auto-phrase` is *project default*, with the fallback stated above. WCAG 1.4.3 is *official requirement*.
- **Verify:** `tests/browser/content-patterns.spec.js` covers the headline size growing between 390 and 1280 px and staying inside 40 to 80 px; `text-wrap` on the headline and subhead; `auto-phrase` and `strict` under `lang="zh-Hans"` with the fallback elsewhere; and the overlay's white text against the scrim over pure white (4.5:1). Checked by hand: the overlay with a real photo in a browser with a GPU (not checked here); a long English word at 320 px.

## Section rhythm and feature grid

Reference CSS: `../web/patterns/section.css`. Used with the card, which is a content surface (no glass).

- **When:** between the major blocks of a page. Use the alternating background (`.as-site-section-alt`) to separate two adjacent sections. Use the card grid for two to four short items with a title and a sentence each. Not for long text (use prose) and not for more than about six cards in one grid.
- **Structure:**

  ```html
  <section class="as-site-section" aria-labelledby="features-title">
    <h2 class="as-site-section-title" id="features-title">Everything in one place</h2>
    <p class="as-site-section-lead">One or two sentences that set up the grid.</p>
    <ul class="as-site-grid">
      <li class="as-site-card">
        <h3 class="as-site-card-title">Shared plans</h3>
        <p>What the card does, in one or two sentences.</p>
      </li>
    </ul>
  </section>
  ```

  A card with a whole-card link uses the title-link pattern from [blog list](#blog-list-breadcrumb-pagination-and-tags) (2.9), not a link around the whole card.
- **Accessibility contract:**
  - Each section has a heading and an `aria-labelledby` that names it. Heading levels follow the page outline: the section title is `h2`, card titles are `h3`.
  - The grid is an unordered list, so a screen reader announces the number of items.
  - Cards are not clickable as a whole unless they use the 2.9 link pattern. A click target without a link is not a control.
  - The card keeps its own edge in forced colours (1px `CanvasText` border), because forced colours remove the background.
- **Responsive:**
  - The grid uses `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))`, so it is one column at 320 px and two to four columns on wide screens without a breakpoint.
  - The gap is 16 px, and 20 px from 48em.
  - Section padding is `clamp(3rem, 2rem + 5vw, 7rem)` vertically. Content lines up with the header and footer edges: they share `--as-site-width` (1120 px) with the same gutter.
  - Adjacent sections with the same background share one gap. The second drops its top padding, so the visible gap is the first section's bottom padding. Two sections with different backgrounds (one alternating) keep both paddings, because the edge between them is visible.
- **Source level:** the vertical rhythm and the alternating background are *visual heuristic* and *observed convention* (apple.com-style marketing pages, observed 2026-10-19, not re-verified online in this revision). The 16rem grid minimum, the gaps and the 1120 px width are *project default*. The solid card follows the content-layer material rule in [materials-and-liquid-glass.md](materials-and-liquid-glass.md), which is *official recommendation* (Apple HIG, *Materials*).
- **Verify:** `content-patterns.spec.js` covers equal card widths and one column at 320 px, the section content aligning with the header brand at 1280 px, and the collapsed gap between two plain sections (one top padding, not two). Checked by hand: the alternating background in dark mode (see the screenshots in the report).

## Pricing and comparison

Reference CSS: `../web/patterns/pricing.css`. Uses `.as-pill` from `controls.css` for the badge and `.as-sr-only` from `preferences.css`.

- **When:** two to four plans with a price and a short list of what each includes. Add a comparison table when the plans differ on several features that the reader must compare. Not for a single price (use the hero or prose), and not for more than about five plan columns.
- **Structure:**

  ```html
  <ul class="as-site-plans">
    <li class="as-site-plan as-site-plan-recommended">
      <p class="as-site-plan-flag"><span class="as-pill as-pill-info">Recommended</span></p>
      <h3 class="as-site-plan-name">Pro</h3>
      <p class="as-site-plan-price"><span class="as-site-plan-amount">$12</span><span>per seat, per month</span></p>
      <p class="as-site-plan-desc">For a team that ships every week.</p>
      <ul class="as-site-plan-list"><li>Unlimited projects</li></ul>
      <a class="as-button as-button-filled as-button-large" href="/signup/pro">Choose Pro</a>
    </li>
  </ul>

  <div class="as-site-compare-region" role="region" aria-label="Plan comparison" tabindex="0">
    <table class="as-site-compare">
      <caption>Compare plans</caption>
      <thead><tr><th scope="col">Feature</th><th scope="col">Starter</th><th scope="col">Pro</th></tr></thead>
      <tbody>
        <tr><th scope="row">Priority support</th>
          <td><span class="as-site-mark as-site-mark-no" aria-hidden="true">–</span><span class="as-sr-only">Not included</span></td>
          <td><span class="as-site-mark" aria-hidden="true">✓</span><span class="as-sr-only">Included</span></td></tr>
      </tbody>
    </table>
  </div>
  ```

- **Accessibility contract:**
  - The table has a `<caption>`, which gives it its accessible name. Column headers are `th scope="col"`, row headers `th scope="row"`. It is a data table, not a layout.
  - The recommended plan has two cues that do not depend on colour: the 2px border (1px on the others) and the text badge "Recommended" (WCAG 1.4.1, official requirement). The padding is 1px smaller so the content lines up.
  - Each check or cross mark is `aria-hidden`, and the words "Included" or "Not included" sit beside it in `.as-sr-only`. The glyph differs in shape, so the mark is not colour-only.
  - The scroll region is an `overflow-x: auto` wrapper with `role="region"`, an `aria-label` and `tabindex="0"`. Why: a comparison table is two-dimensional content. WCAG 1.4.10 (Reflow, official requirement) exempts content that needs two-dimensional layout, so the table may scroll. The region gives keyboard users a focusable, named target to scroll it. `tabindex` is kept explicitly, because not every browser makes a scroll container focusable on its own (not checked in other browsers).
  - The first column (row headers) is sticky, so each row keeps its label while the table scrolls.
  - Prices and feature names are text, not images.
- **Responsive:**
  - Plan cards use `repeat(auto-fit, minmax(min(100%, 17rem), 1fr))`: one column at 320 px.
  - The table has a 34rem (544 px) minimum width, so it scrolls inside its region whenever the region is narrower than that. The page itself never scrolls horizontally.
  - Badges and cells keep their own text; the sticky first column has a solid background so content does not show through it.
- **Source level:** the table semantics and mark text are *official requirement* (WCAG 1.4.1, 1.4.10 exception, 1.1.1). The 2px border, the badge, the 34rem minimum and the sticky column are *project default*. The plan-card layout is *observed convention* (apple.com-style marketing pages, observed 2026-10-19, not re-verified online in this revision).
- **Verify:** `content-patterns.spec.js` covers the recommended plan differing by border width and a badge; the table caption and scoped headers; the visually hidden mark text; at 320 px the region scrolls and the page does not, the region takes keyboard focus and Arrow keys scroll it, and the first column stays in view; contrast in light and dark; forced colours keep the plan border and the table rules. Not checked: a screen reader's reading of the table (not run here).

## FAQ

Reference CSS: `../web/patterns/faq.css`. No JavaScript.

- **When:** a short list of questions, about three to ten. Not for content the reader must read in order (use prose), and not as navigation.
- **Structure:**

  ```html
  <div class="as-site-faq">
    <details class="as-site-faq-item" name="faq">
      <summary>How do I cancel?</summary>
      <div class="as-site-faq-answer"><p>Open the billing page and choose Cancel.</p></div>
    </details>
  </div>
  ```

  `name="faq"` makes the items close one another in browsers that support it (Chromium, Firefox and Safari in their current releases; not re-verified in this revision). Without it the items open independently, which is also correct.
- **Accessibility contract:**
  - `<summary>` is a native disclosure control. Enter and Space toggle it, and the `open` state is the only state. No ARIA is added.
  - The focus ring is a 2px accent outline, drawn with `:focus-visible`.
  - The summary row is at least 44px tall for every pointer, which meets the coarse-pointer target without a media query. (WCAG 2.5.8 is met by the same height.)
  - The answer stays in the document when closed. Its text is available to search and to assistive technology while it is collapsed.
- **Responsive:** the rows are full width. The answer text is limited to 40rem for measure. At 320 px nothing changes except the wrapping of the question.
- **Motion:** the chevron turns over `--as-dur-fast`. Under `prefers-reduced-motion: reduce` the transition is removed. The reference for animation from interactions is WCAG 2.3.3 (AAA); the rule here follows the user setting and does not claim the AAA criterion.
- **Structured data:** FAQPage markup is optional. If it is used, its questions and answers must match the visible text exactly, with no text that is hidden from readers. This is external search-engine guidance (Google Search Central), not re-verified in this revision, and not an Apple rule.
- **Source level:** `<details>` and `<summary>` are the HTML platform controls (*official requirement* as platform behaviour). The chevron, the 44px row and the answer measure are *project default*. WCAG 2.3.3 is *official* but AAA and is cited as a reference only.
- **Verify:** `content-patterns.spec.js` covers Enter toggling an item, the chevron transition removed under reduced motion and kept without it, and a visible focus ring with a summary at least 44px tall. Not checked: a screen reader's announcement of the expanded state (not run here).

## Article prose

Reference CSS: `../web/patterns/prose.css`. Links are underlined by `base.css`; this file does not reset them.

- **When:** article bodies, long posts, documentation text and any reading-first page. Not for interface text, labels or short marketing copy (use the section pattern).
- **Structure:**

  ```html
  <article class="as-prose" lang="en">
    <h2>Start with a plan</h2>
    <p>Begin by listing the work. Then <a href="/pricing">compare the plans</a>.</p>
    <blockquote><p>A plan that nobody can read is not a plan.</p></blockquote>
    <figure>
      <img src="/img/steps.webp" width="1200" height="800" alt="Three steps in a row">
      <figcaption>Figure 1. The three steps.</figcaption>
    </figure>
    <pre tabindex="0"><code>npm install example-cli</code></pre>
    <div class="as-prose-table" role="region" aria-label="Limits by plan" tabindex="0">
      <table>
        <caption>Limits by plan</caption>
        <thead><tr><th scope="col">Plan</th><th scope="col">Projects</th></tr></thead>
        <tbody><tr><th scope="row">Starter</th><td>3</td></tr></tbody>
      </table>
    </div>
  </article>
  ```

- **Accessibility contract:**
  - Set `lang` on the article (`zh-Hans`, `ja`, `en`), so the browser uses the right CJK glyphs and hyphenation.
  - Links inside running text are underlined (WCAG 1.4.1, official requirement). Do not write `a { text-decoration: none }`: that removes the underline from running-text links as well (audit W4). Style the link colour if needed; the underline comes from `base.css`.
  - Long code scrolls inside its `pre`. `tabindex="0"` lets a keyboard user scroll it in browsers that do not do this on their own (not checked in other browsers).
  - Tables are wrapped in a labelled, focusable region. They have a caption and scoped headers.
  - Figures have a caption (`figcaption`) that adds information. Decorative images inside a figure get `alt=""`.
  - Headings follow the outline: `h2` for sections, `h3` below them.
- **Responsive:**
  - Measure: `max-inline-size: 65ch` for Latin. Under `:lang(zh)` and `:lang(ja)` it is `40em`.
  - Images are `max-width: 100%` with their height auto.
  - Long URLs and words wrap (`overflow-wrap`). Code and tables scroll inside their own box, so the page never scrolls horizontally.
- **Source level:** underlining is *official requirement* (WCAG 1.4.1). The 65ch measure is *visual heuristic*, in the 60 to 75 character range of typography.md. The 40em CJK measure is *visual heuristic* (about 40 characters at 17px). The 1.6 Latin and 1.7 CJK line heights are *visual heuristic* (CJK about 1.7 in typography.md). The classes and sizes are *project default*.
- **Verify:** `content-patterns.spec.js` covers the prose link underlined and the navigation, breadcrumb, pagination and tag links not underlined; the code block scrolling inside itself at 390 px; the Latin measure at most 75ch at 1280 px; and the `zh-Hans` article at most 40em. Checked by hand: 200% text zoom at 320 px (not run here).

## Blog list, breadcrumb, pagination and tags

Reference CSS: `../web/patterns/blog.css`.

- **When:** a list of posts (`.as-site-postlist`), a breadcrumb on pages two or more levels deep (`.as-site-breadcrumb`), pagination for a list of many pages (`.as-site-pagination`), and tags for topic links (`.as-site-tags`). Not infinite scroll without page links, because each page needs a URL that can be opened on its own.
- **Structure:**

  ```html
  <ul class="as-site-postlist">
    <li class="as-site-post">
      <p class="as-site-post-meta"><time datetime="2026-10-02">2 October 2026</time> · <span>Design</span></p>
      <h3 class="as-site-post-title"><a class="as-site-post-link" href="/blog/plan">Start with a plan</a></h3>
      <p class="as-site-post-summary">A summary in one or two sentences.</p>
    </li>
  </ul>

  <nav class="as-site-breadcrumb" aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/blog">Blog</a></li>
      <li><span aria-current="page">Start with a plan</span></li>
    </ol>
  </nav>

  <nav class="as-site-pagination" aria-label="Pagination">
    <ul>
      <li><a href="/blog?page=1" rel="prev">Previous</a></li>
      <li><a href="/blog?page=2" aria-current="page">2</a></li>
      <li><a href="/blog?page=3" rel="next">Next</a></li>
    </ul>
  </nav>

  <nav class="as-site-tags" aria-label="Tags">
    <ul>
      <li><a href="/tags/design">Design</a></li>
      <li><a href="/tags/design/accessibility" aria-current="true">Accessibility</a></li>
    </ul>
  </nav>
  ```

- **Accessibility contract:**
  - `<time datetime>` gives a machine-readable date next to the human-readable one.
  - Whole-card link: the title link's `::after` covers the card. The meta line and summary sit above it (`z-index`), so their text stays selectable and does not follow the link. Only the title text cannot be selected by dragging, because it is the link. This is acceptable only with that layering. A card without a visible title link must not be made clickable.
  - Breadcrumb: an ordered list in `nav aria-label="Breadcrumb"`. The current item is not a link; it has `aria-current="page"` and a heavier weight. The separator "/" is generated by CSS. Most screen readers do not announce generated separators (not checked here).
  - Pagination: `nav aria-label="Pagination"`. The current page has `aria-current="page"`, a ring and a heavier weight, so it is not marked by colour alone. Prev and next are text ("Previous", "Next"), not arrows alone, and carry `rel="prev"` and `rel="next"`.
  - Tags: a named `nav` landmark. Each tag is a capsule with its text, so the link is not told apart by colour alone. The current tag has `aria-current="true"`, a ring and a heavier weight. Links in `nav` are not underlined by `base.css`, which is intended here.
  - Target size: pagination and tags are 36 px and 32 px by default, and 44 px with coarse input. Breadcrumb links are 32 px even with coarse input. That is below 44px and is a known gap of this pattern.
- **Responsive:**
  - Post cards are full width. The summary is limited to 40em for measure.
  - Pagination wraps and centres. The breadcrumb wraps at narrow widths.
  - No horizontal overflow at 320 px (checked with the other page checks).
- **Source level:** `<time datetime>`, `aria-current` and `nav` landmarks are *official recommendation* (HTML and WAI-ARIA 1.2, W3C). The card layering, the ring and weight for the current item and the sizes are *project default*. The list, breadcrumb and pagination layouts are *observed convention* (observed 2026-10-19, not re-verified online in this revision).
- **Verify:** `content-patterns.spec.js` covers `aria-current` on the breadcrumb and pagination items with a weight or ring difference; the summary staying selectable and not the card link; the title link covering the card; the contrast of meta text, summary, breadcrumb and tag text in light and dark; and forced colours for the current tag and pagination item. Not checked: a screen reader's reading of the breadcrumb separators, and keyboard use in Safari and Firefox.

## Website forms

Reference CSS: `../web/patterns/site-form.css`. Script: `../web/js/site-form.js` (1,872 bytes minified with esbuild 0.25.0; no dependency; load with `defer`). Core classes used: `.as-form`, `.as-form-field`, `.as-form-label`, `.as-form-hint`, `.as-form-error`, `.as-input` and `.as-button` from `controls.css`.

- **When:** a contact form, an enquiry, or a newsletter sign-up: a few fields, one submit action. Not for a sign-up with passwords, a multi-step checkout or a form with many fields (about eight or more is the project's limit for this pattern). Those need server-side validation and their own layout.
- **No backend is included.** The skill does not supply an endpoint. Three ways to send the form, from least to most work:
  - *Plain POST* (`action` and `method="post"`): the form goes to a server or form service and the server answers with a page. Without JavaScript this is the only path, and the browser's own validation runs (the script sets `novalidate`, not the markup).
  - *In-page success* (`data-ajax`): the script posts with `fetch` to `action`, shows `data-success` in the status region when the response is 2xx, and shows `data-failure` otherwise. The endpoint must accept a POST and return 2xx.
  - *`mailto:`* is not a form. It does no validation, cannot show a result, and exposes the address to crawlers and spam. Do not use it as the send path.
  - *Project default* (the spam and endpoint choices are the owner's): the skill does not choose a form service. Document the chosen endpoint next to the form.
- **Structure:**

  ```html
  <div class="as-site-form-wrap">
    <p class="as-site-form-status" role="status" tabindex="-1"></p>
    <form class="as-form as-site-form" data-site-form data-ajax action="/contact" method="post"
      data-success="Thanks. We will reply within two working days."
      data-failure="We could not send your message. Try again, or write to hello@example.com.">
      <div class="as-site-form-summary" tabindex="-1" hidden>
        <p class="as-site-form-summary-title">Check the highlighted fields.</p>
        <ul></ul>
      </div>
      <div class="as-site-form-grid">
        <div class="as-form-field">
          <label class="as-form-label" for="c-name">Name <span class="as-site-form-required">(required)</span></label>
          <input class="as-input" id="c-name" name="name" autocomplete="name" required aria-describedby="c-name-error">
          <span class="as-form-error" id="c-name-error" hidden>Enter your name.</span>
        </div>
        <div class="as-form-field">
          <label class="as-form-label" for="c-email">Email <span class="as-site-form-required">(required)</span></label>
          <input class="as-input" id="c-email" name="email" type="email" autocomplete="email" inputmode="email"
            required aria-describedby="c-email-hint c-email-error">
          <span class="as-form-hint" id="c-email-hint">We reply to this address.</span>
          <span class="as-form-error" id="c-email-error" hidden>Enter an email address like name@example.com.</span>
        </div>
        <div class="as-form-field as-site-form-wide">
          <label class="as-form-label" for="c-message">Message <span class="as-site-form-required">(required)</span></label>
          <textarea class="as-input" id="c-message" name="message" rows="5" required aria-describedby="c-message-error"></textarea>
          <span class="as-form-error" id="c-message-error" hidden>Write a message of at least one sentence.</span>
        </div>
      </div>
      <div class="as-site-form-trap" aria-hidden="true">
        <label>Leave this empty <input name="website" tabindex="-1" autocomplete="off"></label>
      </div>
      <div class="as-site-form-actions">
        <button class="as-button as-button-filled as-button-large" type="submit">Send message</button>
      </div>
    </form>
  </div>
  <script src="/js/site-form.js" defer></script>
  ```

  Newsletter: the same wrapper with `.as-site-form-inline` around one `.as-form-field` and a button. The field takes the row and the button wraps below it at 320 px. The fixture `tests/fixtures/site-forms-media.html` has both.
- **Accessibility contract:**
  - **Labels.** Every control has a visible `<label for>`. A placeholder is a hint, never the label.
  - **Required.** The word *(required)* is in the label text, and the control has `required`. The mark is text, not a colour or an asterisk alone. A note above the form says what required means. Optional fields say *(optional)*.
  - **Autofill and input type.** `autocomplete` uses the standard tokens (`name`, `email`, `organization`, and others from the HTML list). `inputmode="email"` on email fields. Inputs are 17 px, so iOS does not zoom on focus.
  - **Inline errors.** The error is a `.as-form-error` next to its field, and it is outside the `<label>`. A visible error inside the label becomes part of the field's accessible name. The control gets `aria-invalid="true"` while it is wrong, and `aria-describedby` lists the hint and the error by id. The error stays referenced when hidden, so the description is ready when it appears. The error text says how to fix the problem, not only that there is one.
  - **Error summary: focus moves to it (project default).** On an invalid submit the summary is shown, it takes focus, and it lists each wrong field as a link (`href="#id"`, so every field needs an `id`). The summary has no `role="alert"`. Reason: moving focus is announced by screen readers and leaves the keyboard user where they can act (on the summary's links). `role="alert"` announces without moving focus, so the user stays on the button. Using both reads the message twice. Screen-reader behaviour is not checked in this revision.
  - **When errors appear.** On submit, and when a field that is already wrong is left. An untouched empty field shows no error until submit, and an error clears as soon as the field is fixed and left.
  - **Success and failure: role=status (project default).** The status region is always in the DOM, because a live region must exist before its text changes. It is filled on the outcome of a send and takes focus, so the user lands on the message. `data-state="success"` or `"error"` gives the message its meaning in text as well as colour. After success the fields are cleared, and the submit button stays in place.
  - **Honeypot.** The trap field is a text input named `website`, labelled *Leave this empty*. It has `tabindex="-1"`, `autocomplete="off"`, and sits in an `aria-hidden` container, so no keyboard or screen-reader user reaches it, and `getByRole` in a test does not find it. It is moved off-screen with `inset-inline-start: -10000px` rather than `display: none`, because some bots skip hidden fields and fill the rest. If the trap has a value, the script sends nothing and shows the success text. **The honeypot is never the only spam defence.** It stops naive bots only. Server-side validation, rate limits and a form service's own checks are needed for real protection, and their choice is the owner's.
  - **Targets.** Fields and buttons are at least 44 px tall (`--as-hit-min`, from the core layer).
- **Responsive:**
  - One column at 320 px. From 48em the short fields (name, organization) sit in two columns, and the message spans both.
  - The inline sign-up is a row from about 16rem (256 px) of field width, and wraps below that.
  - The form is capped at 40rem of measure. Nothing overflows at 320 px (tested).
- **Source level:**
  - Labels and instructions: WCAG 3.3.2 Labels or Instructions (*official requirement*, level A). Error identification: WCAG 3.3.1 (*official requirement*, A). Error suggestion, where the fix is known: WCAG 3.3.3 (*official requirement*, AA). Status messages: WCAG 4.1.3 (*official requirement*, AA). Input purpose tokens: WCAG 1.3.5 (*official requirement*, AA). Target size: WCAG 2.5.8 (*official requirement*, AA; the 44 px height is a *project default*).
  - `aria-invalid`, `aria-describedby`, `role="status"` and `hidden` are ARIA and HTML behaviour (*official recommendation*, WAI-ARIA 1.2 and the HTML Living Standard).
  - The summary-with-focus choice, the trap placement, the two-column grid, the 40rem measure, the 16rem inline breakpoint and the success state are *project defaults*. The honeypot is a *heuristic* against bots, not a standard.
- **Verify:** `tests/browser/site-forms-media.spec.js`:
  - Tab never reaches the honeypot, and `getByRole` does not find it; the trap is off-screen and has `tabindex="-1"` and `aria-hidden`;
  - a filled honeypot sends no request and shows the success text;
  - an empty submit focuses the summary, the summary links to the three required fields in order, and each field has `aria-invalid="true"`, a described-by id pointing at its error, and a visible error;
  - a corrected field clears its error on leaving it;
  - a valid submit posts the fields, shows the success text as `role="status"`, takes focus and clears the fields; a 500 response shows the failure text with `data-state="error"` and keeps the values;
  - the required and optional marks are text, and the autocomplete and inputmode tokens are set;
  - without JavaScript `novalidate` is not set, so the browser's own validation runs;
  - no horizontal overflow at 320 px, and the inline sign-up's button wraps below its field.

  Not checked: screen readers (no NVDA, JAWS, VoiceOver or TalkBack run here), Safari and Firefox, a real endpoint or form service, spam filtering effectiveness, and the iOS zoom behaviour on a device.

## 404 and legal pages

Reference CSS: `../web/patterns/legal.css` (table of contents, last-updated line, 404 layout). Legal text itself is article prose (`prose.css`, *Article prose* above).

- **When:** every site needs a 404 page. A legal page (privacy, terms, and similar) is long-form text, so it uses article prose, and a table of contents when it has about four or more sections. The content of legal pages is the site owner's responsibility. This skill gives no legal advice and supplies no legal text.
- **404 structure:**

  ```html
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Page not found · Example</title>
    <meta name="robots" content="noindex">
    <link rel="stylesheet" href="/css/apple-core.css">   <!-- root-relative: keeps styles on any depth -->
  </head>
  <body class="as-body">
    <main class="as-site-404">
      <p class="as-site-404-code" aria-hidden="true">404</p>
      <h1 class="as-site-404-title">Page not found</h1>
      <p class="as-site-404-text">The address may be mistyped or the page may have moved. Start from the home page or the sitemap.</p>
      <div class="as-site-404-links">
        <a class="as-button as-button-filled" href="/">Home</a>
        <a class="as-button as-button-tinted" href="/sitemap">Sitemap</a>
      </div>
    </main>
  </body>
  </html>
  ```

  Serve the page with HTTP status 404. The host sets the status, not the page: see `website.md`, *Static hosting and deployment*. A redirect to `/` for a missing page is not a 404 and is not used here.
- **Legal page structure:**

  ```html
  <article class="as-prose" lang="en">
    <h1>Privacy notice</h1>
    <nav class="as-site-toc" aria-labelledby="toc-title">
      <p class="as-site-toc-title" id="toc-title">On this page</p>
      <ol>
        <li><a href="#data">What we collect</a></li>
        <li><a href="#use">How we use it</a></li>
      </ol>
    </nav>
    <p class="as-site-updated">Last updated <time datetime="2026-10-01">1 October 2026</time></p>
    <h2 id="data">What we collect</h2>
    <p>…</p>
    <h2 id="use">How we use it</h2>
    <p>…</p>
  </article>
  ```
- **Accessibility contract:**
  - **404.** The page title and the `h1` say what happened. The large numeral is decoration (`aria-hidden`), because the words carry the message. There is no automatic redirect or `<meta http-equiv="refresh">`, so the user can read the message. The page offers links home and to the sitemap. A search box is optional: it needs a search endpoint or a static index, and without one it is omitted rather than left as a dead form.
  - **noindex.** The 404 page has `<meta name="robots" content="noindex">`, so search engines do not keep it as a page.
  - **Root-relative assets.** The page links its CSS and scripts from `/`, not with a relative path. A relative path such as `css/…` resolves under the requested folder, so a 404 at `/blog/a/b/` loses its styles. The deep-path check in `website.md`, *Launch checklist* covers this on the built site.
  - **Legal headings.** One `h1`, then `h2` for each section, and the table of contents is a named `nav` whose links point to the `id`s of those headings. The in-page anchors use the `html { scroll-padding-top }` rule from the header pattern, so a heading is not hidden under a sticky bar.
  - **Last updated.** The date is a `<time datetime>` element, so the text is readable and the value is machine-readable.
  - **Links in text** stay underlined (`base.css`), as in the rest of the article.
- **Responsive:**
  - The 404 block uses `clamp()` for the padding and the numeral (about 48 to 96 px), so it stays inside a 320 px screen. The links wrap.
  - The table of contents is one column at every width. Its links are 32 px tall and 44 px with coarse input.
  - Legal text follows the measure in *Article prose*.
- **Source level:**
  - `noindex` and the 404 status: *official recommendation*. RFC 9110 defines the status meaning. The `noindex` directive is search-engine documentation (*vendor documentation*, not re-verified in this revision), and it is not a web standard.
  - Headings, links and the `time` element: WCAG 1.3.1 and 2.4.6 (*official requirement*, AA) and the HTML Living Standard (*official recommendation*).
  - The table-of-contents layout, the 40rem measure and the 404 layout are *project defaults* and *observed conventions*. The three-section threshold for a table of contents is a *heuristic*.
- **Verify:** no browser test covers `legal.css` in this revision. The 404 status, the `noindex` and the deep-path styles are host and build checks: the `check-site` script (plan 3.2) is the planned place. Recorded here: a scratch render of a legal page and a 404 block at 390 px showed no horizontal overflow and the expected heading order; not a repository test. Not checked: a real host's 404 status, and legal content (the owner's responsibility).

## Product imagery and HTML mockups

Reference CSS: `../web/patterns/mockup.css` (mockup and App Store badge). Use real screenshots first. Apple's own product images are covered in *App Store badge and Apple trademarks* below.

- **When:** product pages that need to show the interface. Use a real screenshot of the app running on the latest OS, with fictional account data (the App Store marketing guidelines ask for this; see the source level below). Use an HTML mockup only when a screenshot would go out of date quickly, when it would be unreadable at phone width, or when a few interface elements carry the message. Not for a dense interface, not as a fake device, and not for a drawing of an Apple product.
- **Two variants:**
  - **(a) Readable (default).** The mockup is ordinary content: real text, solid tokens, and it meets the body-text contrast rules in both appearances.
  - **(b) Image.** The container is one labelled image (`role="img"` and `aria-label`), and its contents are `aria-hidden`. Assistive technology reads one sentence instead of the rows. **Contrast still applies.** `aria-hidden` removes text from assistive technology only. WCAG 1.4.3 is about what sighted users see, and the automated checks (axe and similar tools) look at rendered colours, not the accessibility tree. Automated checks were not run here, because the project has no axe install in this revision.
  - **Honest note on the exemptions.** WCAG 1.4.3 exempts *incidental* text: text that is pure decoration, not visible, part of an inactive control, part of a picture with significant other content, or a logotype. A readable app mockup in a marketing page is not one of these in practice, and its labels are presented as content. The skill therefore treats the labels as needing contrast. This is an interpretation, not a settled reading, and the exemption is not relied on.
- **Structure:**

  ```html
  <div class="as-site-mockup" aria-labelledby="mock-title">       <!-- (a) readable -->
    <div class="as-site-mockup-head">
      <p class="as-site-mockup-title" id="mock-title">Invoices</p>
      <span class="as-site-mockup-muted">This month</span>
    </div>
    <ul class="as-site-mockup-rows">
      <li class="as-site-mockup-row"><span>Studio Lin, invoice 204</span><span class="as-pill as-pill-success">Paid</span></li>
      <li class="as-site-mockup-row"><span>Harbor Cafe, invoice 205</span><span class="as-pill as-pill-warning">Due in 5 days</span></li>
    </ul>
  </div>

  <div class="as-site-mockup" role="img" aria-label="Invoice list: one paid, one due in five days">   <!-- (b) image -->
    <div aria-hidden="true">…the same markup…</div>
  </div>
  ```

  No interactive control goes inside the image variant: a button inside an `aria-hidden` block is focusable and unlabelled. Use the readable variant if the mockup has controls.
- **Accessibility contract:**
  - Text in a mockup is HTML text, not an image of text. The image of text rule (WCAG 1.4.5, *official requirement*, AA) and the contrast rule (1.4.3) both apply to it.
  - Fictional names and amounts. Do not show a real person's data.
  - Status words are text, and the colour is a second cue (`.as-pill`).
  - The mockup has no device frame, no window title bar and no glass: its surfaces are solid tokens (`--as-site-surface`, `--as-bg-secondary`). A fake window title bar on a website is not allowed (*Site header*, and `SKILL.md`, *On a website, don't*).
- **Responsive:** the mockup is a block with a 760 px measure in the fixture. Its rows are at least 44 px tall. At 320 px a scratch probe (not a repository test) showed no overflow, and the row with the longest text wrapped its status pill below the text.
- **Source level:**
  - Text contrast: WCAG 1.4.3 (*official requirement*, AA). Image of text: WCAG 1.4.5 (*official requirement*, AA). The image variant's labelling: WAI-ARIA 1.2, `role="img"` and `aria-hidden` (*official recommendation*).
  - The incidental-text exemption and its reading here: WCAG 1.4.3 Understanding (*official text, interpretation uncertain*, see above).
  - The device-frame and fictional-data guidance: App Store marketing guidelines, *Screen Content* and *Unauthorized Uses* (*Apple guidance*, scope: marketing for an app; applied here as a default for product screens).
  - The row layout, the 760 px measure, the padding and the mockup surfaces are *project defaults*. The layout is an *observed convention* (product marketing pages, observed 2026-10-19, not re-verified online in this revision).
- **Verify:** `tests/browser/site-forms-media.spec.js`: the readable and the aria-hidden mockup text at 4.5:1 or more in light and in dark, including each status pill; the image variant is one labelled image with its contents hidden and no list items exposed; the mockup surface has no backdrop filter. Not checked: a screen reader's reading of the image variant, and an automated contrast tool run.

### App Store badge and Apple trademarks

Reference CSS: `.as-site-store-badge` in `../web/patterns/mockup.css`. **The skill does not ship badge artwork or product images.** Take the badge from Apple's marketing tools or the download package named in the guidelines. The reference copy is `../../Apple-Style-HIG/reference/marketing/guidelines.md`. Section names are quoted below. The copy in the repository is dated in its licence block (`EA0861 08/15/17`): check the current agreement and guidelines before publishing.

- **When:** a site that promotes an app which is available on the App Store, and whose badge links to that app's App Store page. The license grants the artwork only for applications available for download on the App Store (*App Store Marketing Artwork License Agreement*, section 1). Not for an app that is not on the App Store, not for a site that is not about an Apple platform app, and not as a decoration.
- **Structure:**

  ```html
  <p>Available on the App Store.</p>
  <a class="as-site-store-badge" href="https://apps.apple.com/app/example/id0000000000">
    <img src="/img/download-on-the-app-store.svg" width="120" height="40" alt="Download on the App Store">
  </a>
  ```

  The 120 × 40 values are placeholders. Use the artwork's own proportions, and the rendered height is set by the CSS to 40 px.
- **Accessibility contract:**
  - The link text is the badge's alternative text. For English artwork, `alt="Download on the App Store"`. For localized artwork, the alternative text is the words printed on that artwork. Apple provides the localized versions, and the guidelines say to use them (*Localized Badges*). Whether the exact localized wording must match the artwork's words is *not stated* in the guidelines: mark it as uncertain and check the artwork.
  - The call to action is text next to the badge, as the guidelines require (*Messaging and Writing Style*). Use "Available on the App Store" or "Can be downloaded from the App Store". Do not use "at the App Store" or "downloadable" (*App Store*, *Messaging and Writing Style*).
  - Focus is visible, with an outline outside the clear space.
- **Rules from the guidelines** (sections in the reference file):
  - **One badge per layout, subordinate to the main message** (*Badge Use*). The badge is not the largest element on the page.
  - **Black is the preferred badge** (*Preferred Badges*). The white badge is an *alternative*: use it only when the black one looks heavy, when one badge is in the layout, and when no other platform badge appears (*Alternative Badges*). With another platform's badge in the layout, use black. The guidelines do not say which badge to use on a dark page: choosing the white badge there is an interpretation, and it is not a stated rule.
  - **Place the App Store badge first** in any lineup of badges (*Preferred Badges*).
  - **Do not modify it.** No cropping, rotation, recolouring, animation, or change of the grey border (*Preferred Badges*, *Badge Use*). The CSS sets no filter, transform, animation or opacity on the image, and a test checks this.
  - **Size and clear space.** At least 40 px tall onscreen, legible but not dominant. Clear space is one quarter of the badge height (10 px at 40 px); no photo, text or graphic inside it (*Graphic Standards*). The link padding provides it.
  - **Link it to the app's App Store product page** (*Link to Your App*, which refers to generated short links or embed code from Apple's marketing tools).
  - **No trademark symbols on the artwork and none in headlines** (*Trademark Symbols*).
  - **Credit lines** appear once, where the legal notice is, and when the badge is used they credit both Apple and the Apple logo (*Credit Lines*). The sentence format is in *Credit Lines*: "______ and ______ are trademarks of Apple Inc., registered in the U.S. and other countries." Take the exact trademark names and symbols from Apple's trademark list, which the guidelines cite. Not checked online in this revision.
- **Product names and wording** (*Messaging and Writing Style*, *Product Names*, *Spelling and Language*):
  - Say "app name for iPhone", "works with" or "compatible with". Never "iPhone app name" (*Product Names*).
  - Capitalisation as Apple sets it: iPhone, iPad, Mac, MacBook Air, MacBook Pro, iMac, Apple Watch, Apple Vision Pro, Apple TV. Never in all capitals. "iPhone" starts with a lower-case i, even at the start of a sentence (*iPhone, iPad, and iPod touch*).
  - "the App Store". Not "Apple App Store", "iTunes App Store", "iPhone App Store" or "at the App Store" (*App Store*).
  - List only the products the app runs on (*Product Names*).
  - Apple trademarks are not translated, even inside non-English copy (*Do Not Translate*).
  - Apple trademarks in a URL come after the company or product name, and a URL never starts with one (*URL Address Naming*). A page slug such as `/for-iphone` is acceptable for a page about an iPhone app; `/iphone-app` on its own is not.
- **Apple product images and devices** (*Apple Product Images*, *Unauthorized Uses*):
  - Use Apple's bezels as provided, unmodified: no cropping, tilting, shadows, reflections, or elements that appear to leave the screen. Show the latest device the app supports. Minimum 200 px onscreen.
  - **No 3D renders, simulations or illustrations of Apple products**, and no graphics that represent a product. The HTML mockup in this file has no device frame for this reason: a drawn frame that matches an Apple product is an illustration of one.
  - Screen content is the real app on the latest OS with fictional account data, and no blank screen (*Screen Content*).
- **Verify:** `tests/browser/site-forms-media.spec.js`: the badge image is 40 px or taller, its link padding is at least a quarter of its height, its proportions match the file, and it has no filter, transform, opacity or animation. Not checked: the artwork itself, its licence status and its localized text; the current guidelines and licence (the reference copy is dated); the trademark list; and any wording against an Apple brand review.

## Images and media

Reference CSS: `../web/patterns/media.css`. Most rules are HTML attributes; the CSS gives boxes, captions and the control under a decorative video.

- **When:** every content image. Video for an explanation (with captions, a transcript and controls) or for a short decorative loop with a visible pause control. Not autoplaying video with sound, and not a video that carries information without a text alternative.
- **Responsive images and formats:**

  ```html
  <picture>
    <source media="(prefers-color-scheme: dark)" type="image/webp"
      srcset="/img/hero-dark-800.webp 800w, /img/hero-dark-1600.webp 1600w" sizes="(min-width: 64em) 50vw, 100vw">
    <source type="image/avif" srcset="/img/hero-800.avif 800w, /img/hero-1600.avif 1600w" sizes="(min-width: 64em) 50vw, 100vw">
    <source type="image/webp" srcset="/img/hero-800.webp 800w, /img/hero-1600.webp 1600w" sizes="(min-width: 64em) 50vw, 100vw">
    <img src="/img/hero-800.jpg" srcset="/img/hero-800.jpg 800w, /img/hero-1600.jpg 1600w" sizes="(min-width: 64em) 50vw, 100vw"
      width="1600" height="1000" alt="" fetchpriority="high" decoding="async">
  </picture>
  ```

  The browser uses the first `<source>` that matches the media query and that it supports. So the dark source comes first, and the format sources follow it for the light scheme. The `<img>` is the fallback and the only element that sets `width`, `height` and the LCP hints.
- **Attributes and loading:**
  - Always `width` and `height` on images, so the box is reserved before the file arrives (layout shift). The CSS keeps `height: auto`, so the ratio holds.
  - **First-screen image (LCP candidate):** `fetchpriority="high"`, no `loading="lazy"`. A lazy hero image delays the largest paint.
  - **Everything else:** `loading="lazy"` and `decoding="async"`.
  - `sizes` must match the layout: the value above is for a half-width image from 64em. A wrong `sizes` loads a larger file than needed.
  - For a cropped box, use `.as-site-ratio` with `--as-ratio` and `object-fit: cover` on the image. The box reserves the space.
- **Video:**

  ```html
  <!-- Explanatory: controls, captions and a transcript -->
  <figure class="as-site-media">
    <video controls preload="metadata" poster="/img/demo-poster.jpg" width="1280" height="720">
      <source src="/video/demo.webm" type="video/webm">
      <source src="/video/demo.mp4" type="video/mp4">
      <track kind="captions" srclang="en" label="English" src="/video/demo.en.vtt" default>
      <p>Your browser cannot play this video. <a href="/video/demo.mp4">Download it</a>.</p>
    </video>
    <figcaption>The demo in 90 seconds. <a href="/video/demo-transcript">Read the transcript</a>.</figcaption>
  </figure>

  <!-- Decorative loop: no sound, visible pause control, starts paused under reduced motion -->
  <figure class="as-site-media">
    <div class="as-site-ratio" style="--as-ratio: 16 / 9">
      <video id="loop" src="/video/loop.webm" poster="/img/loop-poster.jpg" autoplay muted loop playsinline aria-hidden="true"></video>
    </div>
    <div class="as-site-video-bar">
      <span class="as-site-mockup-muted">Background loop, no sound.</span>
      <button class="as-button as-button-tinted as-button-small" type="button" id="loop-toggle" aria-controls="loop">Pause video</button>
    </div>
  </figure>
  <script>
    (function () {
      var v = document.getElementById('loop'), b = document.getElementById('loop-toggle');
      function sync() { b.textContent = v.paused ? 'Play video' : 'Pause video'; }
      b.addEventListener('click', function () { if (v.paused) v.play(); else v.pause(); sync(); });
      v.addEventListener('play', sync); v.addEventListener('pause', sync);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) v.pause();
      sync();
    })();
  </script>
  ```

  - The explanatory video has no autoplay. Its `preload="metadata"` loads the length and the first frame, and no more.
  - The decorative loop is `muted`, `playsinline`, `loop` and `aria-hidden`. Its pause control sits on a solid bar beside it, not over the picture, so its contrast does not depend on the frames.
  - Chromium does not start an autoplaying video that is outside the viewport. This is a browser behaviour, and it means a loop low on the page starts when it is scrolled into view.
- **Accessibility contract:**
  - **Alt text.** An informative image has an `alt` that gives its meaning. A decorative image has `alt=""`. The figure caption adds information; it is not a substitute for `alt` (WCAG 1.1.1, *official requirement*, A).
  - **Captions.** Prerecorded video with sound has captions (WCAG 1.2.2, *official requirement*, A). A transcript is recommended, and it is required where the video carries information that the captions do not (WCAG 1.2.3 and 1.2.5, A and AA). The `<track>` is the caption mechanism.
  - **No autoplay with sound.** Audio that plays automatically for more than 3 seconds needs a mechanism to pause it or control its volume (WCAG 1.4.2, *official requirement*, A). This pattern does not autoplay sound.
  - **Auto-starting moving content** that runs longer than 5 seconds needs a way to pause, stop or hide it (WCAG 2.2.2, *official requirement*, A). The decorative loop has the visible pause control. Under reduced motion it starts paused (*project default*, from `prefers-reduced-motion`). Whether a loop shorter than 5 seconds needs the control is not settled by the text of 2.2.2 for a repeating loop: the control is provided anyway.
  - **Text in images.** Put text in HTML, not in the image (WCAG 1.4.5, AA).
  - **Dark variants** follow the system setting only (`prefers-color-scheme`). The manual theme switch in `website.md`, *Dark mode*, does not change a `<picture>` source. Say so where a dark variant matters.
- **Responsive:** images are `max-width: 100%` with `height: auto`. The ratio box keeps the space at every width. Video is `max-width: 100%`, and the bar wraps its text and control at 320 px.
- **Source level:**
  - Alt text, captions, transcripts, audio control, pause and text in images: WCAG 1.1.1, 1.2.2, 1.2.3, 1.2.5, 1.4.2, 1.4.5, 2.2.2 (*official requirement*).
  - `width`, `height`, `srcset`, `sizes`, `<picture>`, `loading`, `decoding`, `fetchpriority`, `<track>`, `preload` and `playsinline`: HTML Living Standard (*official recommendation*, platform attributes).
  - The LCP guidance (no lazy loading for the first image, high priority) and the image formats are *project defaults*, in line with the performance budget in `website.md`. The measured effect is not re-verified in this revision.
  - The box, caption and bar layout are *project defaults*.
- **Verify:** `tests/browser/site-forms-media.spec.js`: every fixture image has `width` and `height`; the first-screen image is not lazy and has `fetchpriority="high"`; the below-fold image is lazy and async; the `<picture>` picks the dark source under the dark scheme and the light image otherwise; the decorative video plays when in view, the control pauses and resumes it, and it starts paused under reduced motion. Not checked: captions and transcripts (the fixture has no captioned video), AVIF encoding, Lighthouse LCP (not run here), and the video under Safari or Firefox.

## Scroll entrance

Reference CSS: `../web/patterns/motion.css`. No JavaScript. The rule is motion for emphasis, not decoration: see [motion-and-interaction.md](motion-and-interaction.md).

- **When:** one restrained reveal for a block of content on a long landing page, as the reader arrives at it. Not for navigation, forms, pricing tables, FAQ items, articles or any content the reader needs to scan at once. Not parallax, not scroll-jacking, not a reveal that repeats.
- **Structure:**

  ```html
  <section class="as-site-reveal" aria-labelledby="reveal-title">
    <h2 id="reveal-title">Revealed on scroll</h2>
    <p>…</p>
  </section>
  ```

  Add the class to the block, not to every child. The reveal is an opacity change and a 16 px rise, once, as the element enters the viewport (in the first 40 % of its entry range).
- **Accessibility contract:**
  - **Content is visible without the animation.** The start state (opacity 0) is set only inside the `@supports (animation-timeline: view())` and `prefers-reduced-motion: no-preference` guard. Under reduced motion, or in a browser without scroll-driven animations, the element is simply visible.
  - **Only one move, and it does not repeat.** No looping, no scroll-linked transforms on text, no parallax, no scroll hijacking. Those are not in the file, and should not be added in its place.
  - **Screen readers and keyboard users** are not affected: the animation changes opacity and position only, and it does not remove content from the accessibility tree.
  - **Known limitation.** A full-page screenshot or a print can capture an element that has not yet entered the viewport in its start state. Check with a real scroll. This is why the content must never depend on the animation.
- **Responsive:** the same at every width. The 16 px distance is fixed, not relative to the viewport, so the motion is the same on a 320 px screen.
- **Source level:**
  - `prefers-reduced-motion`: the HIG *Motion* guidance, *Reduce Motion* (*official recommendation*), says to replace movement with a fade or to remove it. The file removes the animation entirely under reduced motion, which is stricter than the fade the HIG allows: the content is simply visible.
  - WCAG 2.3.3 Animation from Interactions (AAA) is a reference only: it is not a conformance target here, and the pattern follows the user setting without claiming the criterion.
  - Scroll-driven animations (`animation-timeline: view()`): browser support is *not re-verified in this revision*; the test runs in Chromium only. Browsers without support show the content statically, which is the intended fallback.
  - The 40 % range, the 16 px distance and the opacity fade are *project defaults*, and the choice of one reveal is a *visual heuristic*.
- **Verify:** `tests/browser/site-forms-media.spec.js`: under reduced motion no `as-site-reveal` animation runs and the content is visible before scrolling; with motion allowed the reveal animation exists, the element starts at opacity 0 before it enters the viewport, and it ends at opacity 1 after scrolling. Not checked: Safari and Firefox support for scroll-driven animations, and screenshot behaviour in a full-page capture.
