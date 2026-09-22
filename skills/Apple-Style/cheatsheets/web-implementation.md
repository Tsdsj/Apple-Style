# Web implementation — the last mile from HIG rules to shipped code

The other cheatsheets carry Apple's design rules. This one carries what the web
needs on top of them, and the places where a literal reading of the HIG produces
broken or illegal web code. Pair with `web/apple-style.css` + `web/liquid-glass.js`.

## Two traps to get right before anything else

- **SF Symbols may not be used on the web.** The license covers Apple platform apps
  only — not `<img>`, not an icon font, not inlined SVG on a website. Draw your own
  on a 24×24 grid, 1.8 stroke, round caps/joins (`.as-icon` matches SF's optical
  weight), or use a permissively licensed set. Keep the *semantics* the HIG
  prescribes (the preferred glyph for share/add/edit/delete) without copying the art.
- **SF fonts are not bundled and must not be self-hosted.** `-apple-system` resolves
  to SF only on Apple devices; elsewhere it falls back to Segoe UI / Roboto, whose
  metrics differ. Set the type scale in px/line-height (as the CSS does) rather than
  relying on font-relative sizing, and re-check line lengths on Windows/Android. For
  CJK, append a CJK face and drop the negative tracking — it is designed for Latin.

## Semantics & ARIA for the Apple components

| Component | Markup |
|---|---|
| Tab bar | `<nav>` + links, **not** `role="tablist"` — it navigates between sections. `aria-current="page"` on the active tab. `role="tablist"` only for in-page views that swap content. |
| Segmented control | `role="tablist"` + `role="tab"` `aria-selected` when it swaps views; `role="radiogroup"` + `role="radio"` `aria-checked` when it picks a value. Roving `tabindex` (one `0`, rest `-1`), arrow keys move selection. |
| Toggle | `role="switch"` + `aria-checked`, or a real `<input type="checkbox" role="switch">`. Label describes the **on** state. |
| Slider | Real `<input type="range">` — never rebuild it; you lose keyboard, AT and `aria-valuetext` for free. Add `aria-valuetext` when the number needs units. |
| Sheet / alert | `<dialog>` (or `role="dialog"`/`alertdialog` + `aria-modal`), `aria-labelledby` the title. Trap focus, `inert` the background, **Escape closes**, restore focus to the opener on close. |
| Menu | `role="menu"`/`menuitem`, opener has `aria-haspopup="menu"` + `aria-expanded`. Up/Down move, Escape closes and returns focus, Tab closes. If it is really a listbox or a nav popover, use those roles instead — the menu keyboard model is a contract. |
| Toolbar | `role="toolbar"` with arrow-key navigation; every icon-only button needs an accessible name. |
| Glass group | Decorative container — do **not** give it a role; the buttons inside carry the semantics. |

Focus: never `outline: none` without a replacement. Use `:focus-visible` so pointer
users do not see rings but keyboard users do. Apple's floating controls need a ring
that survives on glass — `outline` with `outline-offset`, not `box-shadow` (glass
already owns `box-shadow`).

## Layout & responsiveness

- Size classes → breakpoints. Compact ≈ `< 768px` (margins 16), regular ≈ `≥ 768px`
  (margins 20).
- **Desktop ≈ `≥ 1024px` is a third tier, not more "regular".** A pointer, a
  resizable window, a menu bar and a multi-column split view exist here and
  nowhere else. Treat `≥ 768px` as "the iPad rules" and `≥ 1024px` as "the Mac
  rules"; set `data-platform="macos"` on `<html>` when the target is a desktop
  app (see *Density*) and build the window skeleton, not a taller phone page
  (see *Desktop windows*). Apple's *regular* is a size class, not a pixel count
  — collapsing it to one number is what makes a 2560px display and a 768px iPad
  the same layout.
- Prefer **container queries** for components that appear in both a
  sidebar and a full-width page.
- Use `100dvh`, not `100vh`, for full-height mobile layouts — `vh` ignores the
  collapsing browser chrome and cuts off your bottom bar.
- Honour the notch and home indicator: `viewport-fit=cover` in the viewport meta,
  then `env(safe-area-inset-*)` on fixed bars (`.as-tabbar` and `.as-safe-bottom`
  already do).
- RTL: logical properties everywhere (`margin-inline-start`, `inset-inline`,
  `padding-block`), never `left`/`right`. Mirror directional icons (back chevron),
  never mirror media or clocks.
- Stacking scale used by the stylesheet — stay inside it rather than inventing
  numbers: content `0`, scroll edge `10`, **split divider `12`**, sidebar `15`,
  **window toolbar `18`**, tab bar `20`, **menu bar `22`**, sheet backdrop `30` /
  sheet `31`, menu/popover `40`, alert `41`, toast `60`. A new overlay picks the
  band it belongs to. The three window-chrome bands sit *below* the sheet
  backdrop on purpose: a modal dims the menu bar and the toolbar too.

## Desktop windows (≥ 1024px) — `.as-window`

A desktop target is a window, not a long page. Two HIG rules decide the whole
skeleton, and both are macOS-only:

> **Avoid placing controls or critical information at the bottom of a window.**
> People often move windows so that the bottom edge is below the bottom of the
> screen. — `hig/layout.md` (macOS)

> Avoid putting critical information or actions in a bottom bar … if you have
> more information to display, consider using an **inspector**, which typically
> presents information on the trailing side of a split view. — `hig/windows.md`

So navigation is the **leading sidebar**, detail is the **trailing inspector**,
and the bottom edge holds nothing you would miss. A bottom tab bar at 1440px is
a compact-width component shipped to the wrong tier.

```html
<div class="as-window">
  <div class="as-menubar" role="menubar" data-shortcuts>…</div>  <!-- optional, in-window -->
  <header class="as-toolbar as-toolbar-window">
    <div class="as-toolbar-group">…sidebar toggle…</div>   <!-- no bezel: the frame is the container -->
    <h1 class="as-toolbar-title">Window title</h1>         <!-- inline with the controls -->
    <div class="as-spacer"></div>
    <div class="as-toolbar-group">…content actions…</div>
    <div class="as-toolbar-group">…inspector toggle…</div>
    <div class="as-search">…</div>                         <!-- top-trailing on Mac -->
    <button class="as-button as-button-filled as-button-small">Done</button>
  </header>
  <div class="as-split">
    <aside class="as-sidebar">…</aside>
    <div class="as-split-divider"></div>
    <main class="as-content">…</main>
    <div class="as-split-divider"></div>
    <aside class="as-inspector">…</aside>
  </div>
</div>
```

Working page: `web/demo-desktop.html`. Below 1024px the same markup degrades to
stacked panes — a fallback, not a design; ship the compact skeleton there.

- **Toolbar is part of the window frame**, not a bar the content scrolls under:
  "the toolbar resides in the frame at the top of a window … window titles can
  display inline with controls, and toolbar items don't include a bezel"
  (`hig/toolbars.md`, macOS). The *panes* scroll, so each pane that needs one
  gets its own scroll edge.
- **Item groupings** (`hig/toolbars.md`): leading = show/hide sidebar then the
  view title; trailing = inspector toggle, search field, More menu, one
  prominent primary action. **Max three groups**, grouped by *function* (view
  commands are not content actions), and never a text button and an icon
  button in the same group.
- **No bezel on window-toolbar items.** "Toolbar items don't include a bezel"
  (macOS), and "Borders aren't necessary because the section provides a
  visible container" — the window frame is that container. Use
  `.as-toolbar-group` (spacing only; bare symbols with hover and selection
  states), **not** `.as-glass-group`: a glass pill on a blurred window frame
  is both the iOS expression in the wrong place and glass on glass. Likewise
  the search field is a bordered Mac field and the primary action is a small
  filled button — neither is a glass capsule here. Floating bars on iPhone and
  iPad keep their glass groups; this is a window-frame rule.
- **Sidebar ≤ two levels.** "When a data hierarchy is deeper than two levels,
  consider using a split view interface that includes a **content list** between
  the sidebar items and detail view" (`hig/sidebars.md`) — that is the
  `.as-list-column` middle pane. Nothing critical at the sidebar's bottom edge
  either (same page, macOS section).
- **Every pane highlights its own current selection**, persistently
  (`hig/split-views.md`).
- **The divider is a control, not a line.** `.as-split-divider` is 1px ("prefer
  the thin divider style … one point in width") with a wider invisible grab
  area; `LiquidGlass.init()` gives it `role="separator"`, `tabindex="0"`, drag,
  arrow keys (Shift = 1px), Home/End, Enter to reset, and keeps `aria-valuenow`
  equal to the width **actually drawn**. It never lets the detail column fall
  below `--as-content-min`, and hands space back when the window shrinks.
- **Menu-bar commands that print a shortcut must respond to it.** Nothing on the
  web wires that up; `data-shortcuts` on `.as-menubar` makes `LiquidGlass` bind
  every `.as-shortcut` it finds (⌘ matches Cmd *or* Ctrl). Opt-in, because a
  page that merely *displays* `⌘C` next to a Copy item must not hijack the real
  one. Every toolbar item should also exist as a menu command (`hig/toolbars.md`).

### Pane widths — starting points, not Apple numbers

The HIG only says "Set **reasonable** defaults for minimum and maximum pane
sizes" (`hig/split-views.md`) without saying what reasonable is. These are the
widths at which a two-level sidebar row and a key/value inspector row stop
wrapping. Measure your own content and move them.

| | ≥ 1280px | 1024–1280px | why |
|---|---|---|---|
| Sidebar | 264 | 220 | two levels + icon + a trailing count, unwrapped |
| Inspector | 380 | 300 | a label/value pair with a currency amount on one line |
| Content | rest, floor ~480 | rest, floor ~380 | below it, a list row with an amount wraps the title |

The derivation matters more than the numbers: **264 + 380 in a 1024px window
squeezes the detail column to 378px, where a row with a number in it wraps to a
second line; 220 + 300 leaves 502px and the number comes back onto one line.**
That is why there are two tiers instead of one set of widths.

- **When to fill and when to limit.** `Readable content width ≈ 672pt`
  (`layout-and-shapes.md`) is a guide for **running text**. Applying it — or its
  cousin `max-width: 1280px` — to a whole page is what leaves 340px of dead
  gutter on either side of a 2000px display. **Tables and lists fill the column
  they live in; continuous prose and forms get `.as-readable` inside it.**
- **Short content.** The whole vocabulary assumes content scrolls. It often
  doesn't: four rows in a 1200px-tall window leaves a panel floating over 300px
  of nothing. In the window tier the panes stretch to the full split height, so
  the sidebar and inspector read as the two **edges of the window** rather than
  two boards lying on a page. `.as-window` is `100dvh` with `overflow: hidden`;
  the panes scroll, the window never does.

## Density (macOS)

`data-platform="macos"` on `<html>` is the desktop density switch, and it is
easy to miss — set it first for any desktop target. It already carries real
numbers, not a tweak:

| | iOS default | `data-platform="macos"` |
|---|---|---|
| Body text | 17/22 | **13/16** |
| `.as-button` | 44px min-height, capsule | **22px**, `--as-radius-xs` |
| `.as-menu-item` | 44px | **28px** |
| Large title | 34/41 | 26/32 |

Inside `.as-window`, sidebar rows and inspector fields use `--as-row-min`
(28px), and `@media (any-pointer: coarse)` raises it back to 44px — see the hit
region note below. macOS keeps **capsules for Large/XL controls and standout
actions only**; mini/small/medium stay rounded rectangles, which is what the
`--as-radius-xs` override is for. A desktop window made entirely of 44pt
capsules is the most common tell that a phone stylesheet was stretched.

## Input, pointer and scrolling

- `touch-action` on anything you drag (`pan-y` for a horizontal scrubber) or the
  browser steals the gesture. Use Pointer Events + `setPointerCapture`, not
  mouse/touch pairs.
- Gate hover affordances behind `@media (hover: hover)`; on `(pointer: coarse)`
  enforce the 44×44 target even when the visual is smaller (pad the hit area).
- **Hit region: 44×44 with a finger, ≥ 24×24 with a pointer** (WCAG 2.2 Target
  Size (Minimum)). Gate on the **input**, not the screen — `@media
  (any-pointer: coarse)` — because a touchscreen laptop at 1440px still needs
  finger-sized rows, and a Mac inspector at 44pt a row holds a third of what it
  should. Keep ≥ 8pt between adjacent targets either way.
- `overscroll-behavior: contain` on sheets, menus and any inner scroller, or
  scrolling to the end scrolls the page behind it.
- `scrollbar-gutter: stable` on panes that toggle overflow, to stop layout jumping.
- Scroll edge effects assume content actually passes under the bar: the scroller
  must extend beneath it, with padding rather than margin creating the inset.

## Forms

- A real `<label for>` for every field; placeholder is a hint, never the label.
- `autocomplete` tokens (`email`, `new-password`, `one-time-code`…) and `inputmode`
  (`numeric`, `decimal`, `email`) — this is most of what makes a form feel native on
  iOS. `type="number"` only for true numbers, never phone or card fields.
- Font-size ≥ 16px on inputs or iOS Safari zooms on focus.
- Errors: `aria-describedby` pointing at the message, `aria-invalid="true"`, message
  next to the field in plain language saying how to fix it — not a red border alone
  (colour-only meaning fails contrast rules).
- Validate on blur and on submit, not on every keystroke; never block typing.

## Theming

- `color-scheme: light dark` on `:root` so form controls, scrollbars and the
  canvas follow the theme (already set). `light-dark()` for token values.
- Respect the system by default; if you offer a switch, persist it and apply the
  attribute **before first paint** (inline script in `<head>`) or you get a flash.
- `<meta name="theme-color">` with `media="(prefers-color-scheme: …)"` so mobile
  browser chrome matches.
- Test all four preference axes in DevTools → Rendering: `prefers-color-scheme`,
  `prefers-reduced-motion`, `prefers-contrast`, `prefers-reduced-transparency`.

## Media

- Always reserve space: `aspect-ratio` + `object-fit: cover`, so glass above the
  image does not reflow when it loads.
- `loading="lazy"` + `decoding="async"` below the fold; `srcset`/`sizes` for hero art.
- Cross-origin images break backdrop sampling (`adapt()` cannot read their pixels) —
  add `crossorigin` or set `data-glass-scheme-hint="dark|light"` on the region.

## States

Every list/collection needs four: loading (skeletons that match the final layout,
not a spinner), empty (says what goes here and how to add it), error (what failed
and a retry), and populated. Keep the glass chrome stable across all four so the
page does not jump.

## Performance (glass is expensive — budget it)

- `backdrop-filter` forces a composited layer and re-runs whenever its backdrop
  changes. Keep it to the navigation layer; ~20 lensed elements per view.
- **Do not blanket `will-change: transform`** on glass. Promoting every glass
  element costs more than it saves; promote only what is currently moving.
- Chromatic dispersion (`data-chroma="on"`) triples the filter cost — a couple of
  hero controls, never the always-on-screen chrome (fixed bars re-render every frame).
- Never read layout (`getBoundingClientRect`, `offsetWidth`) inside `pointermove`.
  Measure once at gesture start, batch writes in one `requestAnimationFrame`.
- Animate `transform`/`opacity` only. Never animate `backdrop-filter`, `blur()`,
  `box-shadow` or `width`.
- `data-perf="lite"` on `<html>` disables lensing wholesale — ship it as an escape
  hatch for low-end devices and for `Save-Data`.

## Frameworks

- React/Vue: render the same classes; `LiquidGlass.attach(ref.current)` in an effect
  for nodes created later (a `MutationObserver` also auto-attaches). Controls own
  their own DOM state and emit `change` — treat them as uncontrolled inputs, or sync
  from `change`, but do not re-render them on every pointermove.
- SSR: the glass renders fine without JS (blur + highlights); lensing, dispersion and
  the drag gestures are progressive enhancements added on hydration.
- Tailwind: keep `apple-style.css` as the source of the material; do not rebuild it
  with `backdrop-blur-*` utilities — you lose lensing, adaptivity and the
  accessibility media queries.

## Verify before shipping

Light + dark · Increase Contrast · Reduce Transparency · Reduce Motion · largest
Dynamic Type · keyboard only · VoiceOver/NVDA · RTL · slow 3G · over dark *and*
light content · Safari and Firefox (no lensing there — confirm the fallback
still reads as a material). **Widths: 320 · 390 · 768 · 1024 · 1440 · 2000** —
a design checked only at one width is how a page ends up with dead gutters at
2000 or a squeezed detail column at 1024. Then run the checklist in
`../Apple-Style-Review/SKILL.md`.
