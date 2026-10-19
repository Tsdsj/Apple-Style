# Website patterns

Scope: [rule strength and evidence](rules-and-evidence.md). Read [website.md](website.md) first for loading, budgets and verification.

Each pattern has a reference CSS file in `../web/patterns/` that uses tokens only. Copy the file, rename the classes if the site uses its own prefix, and keep the core layers (`tokens`, `base`, `glass`, `controls`, `preferences`) loaded. Patterns 2.1–2.9 are written below: header, narrow navigation, footer, hero and display type, section rhythm and feature grid, pricing and comparison, FAQ, article prose, and blog list with breadcrumb, pagination and tags. Later patterns are added by plan items 2.10–2.14 (forms, error and legal pages, images and diagrams, scroll motion) in `docs/plan/`.

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
- **Source level:** the vertical rhythm and the alternating background are *visual heuristic* and *observed convention* (apple.com-style marketing pages, observed 2026-10-19, not re-verified online in this revision). The 16rem grid minimum, the gaps and the 1120 px width are *project default*. The solid card follows the content-layer material rule in [materials-and-liquid-glass.md](materials-and-liquid-glass.md), which is *official recommendation* (Apple HIG, *Materials*).
- **Verify:** `content-patterns.spec.js` covers equal card widths and one column at 320 px, and the section content aligning with the header brand at 1280 px. Checked by hand: the alternating background in dark mode (see the screenshots in the report).

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
