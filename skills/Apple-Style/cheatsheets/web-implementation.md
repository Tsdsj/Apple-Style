# Web implementation — the last mile from HIG rules to shipped code

Scope: [rule strength and evidence](rules-and-evidence.md). Platform recommendations, project defaults and visual heuristics are distinct; apply the cited platform section.

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
| Segmented control | `role="tablist"` + `role="tab"` `aria-selected` when it swaps views; `role="radiogroup"` + `role="radio"` `aria-checked` when it picks a value. Roving `tabindex` (one enabled item `0`, rest `-1`); arrows move focus and, by default, selection. Tabs require linked panels; `data-activation="manual"` defers selection to Enter/Space. Disabled items are skipped. |
| Toggle | `role="switch"` + `aria-checked`, or a real `<input type="checkbox" role="switch">`. Use a stable label such as “Wi-Fi”, independent of the checked state. The runtime upgrades `.as-toggle` button/custom hosts, not native checkbox state. |
| Slider | Real `<input type="range">` — never rebuild it; you lose keyboard, AT and `aria-valuetext` for free. Add `aria-valuetext` when the number needs units. |
| Sheet / alert | `<dialog>` (or `role="dialog"`/`alertdialog` + `aria-modal`), `aria-labelledby` the title. Trap focus, `inert` the background, **Escape closes**, restore focus to the opener on close. |
| Modal dialog (`.as-dialog`) | `<dialog class="as-dialog" aria-labelledby>` opened with `showModal()` — the browser supplies all four of the sheet requirements above. Header, body, footer; footer actions trailing, primary last. A Cancel button inside the form is `type="button"`: the first submit button is the form's default, and Enter must not cancel. |
| Selectable list (`.as-listbox`) | `role="listbox"` + `role="option"` `aria-selected`, `aria-label` on the list. Single select: one tab stop on the selection; Up/Down (Left/Right with `aria-orientation="horizontal"`), Home/End and type-ahead move it; `data-activation="manual"` moves focus only and Space/Enter selects. No interactive content inside an option. Rows that need columns or row actions are a grid or a table instead. |
| Pop-up button | A real `<select class="as-input">`. The stylesheet opts into customizable select (`appearance: base-select`) for pointer input and keeps the platform picker elsewhere. A pull-down *command* menu is a menu button, not a select. |
| Toast | `role="status"` (polite, atomic) — `LiquidGlass.toast()` creates it. For confirmations only; never the only place an error or an action appears. Errors go next to the field or in an alert. |
| Status pill (`.as-pill`) | Plain text in a `<span>` — the word carries the status; the colour repeats it. |
| Menu | `role="menu"`/`menuitem`, opener has `aria-haspopup="menu"` + `aria-expanded`. Up/Down move, Escape closes and returns focus, Tab closes. If it is really a listbox or a nav popover, use those roles instead — the menu keyboard model is a contract. |
| Toolbar | `role="toolbar"` with arrow-key navigation; every icon-only button needs an accessible name. |
| Glass group | Decorative container — do **not** give it a role; the buttons inside carry the semantics. |

Focus: never `outline: none` without a replacement. Use `:focus-visible` so pointer
users do not see rings but keyboard users do. Apple's floating controls need a ring
that survives on glass — `outline` with `outline-offset`, not `box-shadow` (glass
already owns `box-shadow`).

## Layout & responsiveness

- Determine platform, application type and input independently of width (see `rules-and-evidence.md`). The CSS uses 768/1024/1280px as project layout defaults. They do not identify iPad or Mac.
- A wide iPad retains touch/keyboard conventions. A narrow Mac window retains Mac density and commands while panes collapse or stack. Cross-platform websites keep page navigation; a native-looking window is optional.
- `data-platform="macos"` explicitly opts into this stylesheet's Mac density. It is not automatically set by resize. `data-sidebar` explicitly opts into a responsive sidebar transformation.
- Prefer **container queries** for components that appear in both a
  sidebar and a full-width page.
- Use `100dvh`, not `100vh`, for full-height mobile layouts — `vh` ignores the
  collapsing browser chrome and cuts off your bottom bar.
- Honour the notch and home indicator: `viewport-fit=cover` in the viewport meta,
  then `env(safe-area-inset-*)` on fixed bars (`.as-tabbar` and `.as-safe-bottom`
  already do).
- RTL: logical properties everywhere (`margin-inline-start`, `inset-inline`,
  `padding-block`), never `left`/`right`. Mirror directional icons (back chevron),
  never mirror media or clocks. Controls that show progress from one value to
  another flip (`hig/right-to-left.md`): `.as-slider` fills and draws its knob
  from the right and `.as-toggle` turns on toward the left under `dir="rtl"`.
- Stacking scale used by the stylesheet — stay inside it rather than inventing
  numbers: content `0`, scroll edge `10`, **split divider `12`**, sidebar `15`,
  **window toolbar `18`**, tab bar `20`, **menu bar `22`**, sheet backdrop `30` /
  sheet `31`, menu/popover `40`, alert `41`, toast `60` (`<dialog>` and the
  customizable select picker render in the top layer, above all of these). A new overlay picks the
  band it belongs to. The three window-chrome bands sit *below* the sheet
  backdrop on purpose: a modal dims the menu bar and the toolbar too.

## Optional Mac-like windows — `.as-window`

Use this composition when the product is a native Mac app or an explicitly requested Web approximation. Apple's [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) and [Windows](https://developer.apple.com/design/human-interface-guidelines/windows) recommend avoiding critical actions near a movable window's bottom edge. They suggest an inspector when extra detail needs it; they do not require every app to have a sidebar and inspector.

The example uses leading navigation and trailing detail. For a content website, landing page, single-pane tool or established product, keep the appropriate information structure. Width alone cannot make a bottom navigation bar or readable page max-width a violation.

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
stacked panes. The Mac platform attribute remains; test narrow-window content order and overflow before using that fallback in a product.

`.as-split` does not need `.as-window`: a web app can put the split in its own
full-height frame (`block-size: 100dvh`) without a menu bar or Mac density. The
pane tokens (`--as-sidebar-w`, `--as-inspector-w`, `--as-content-min`,
`--as-row-min`, `--as-window-chrome`) are defined on `:root` with the 1024 /
1280 tiers below; override them on `.as-window`, `.as-split` or any ancestor.
`.as-window` itself works with or without the menu bar and toolbar rows.

- **Toolbar is part of the window frame**, not a bar the content scrolls under:
  "the toolbar resides in the frame at the top of a window … window titles can
  display inline with controls, and toolbar items don't include a bezel"
  (`hig/toolbars.md`, macOS). The *panes* scroll, so each pane that needs one
  gets its own scroll edge.
- **Item groupings** (`hig/toolbars.md`): leading = show/hide sidebar then the
  view title; trailing = inspector toggle, search field, More menu, one
  prominent primary action. **Prefer up to three groups** in the cited Mac toolbar pattern, grouped by *function* (view
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
- **Sidebar hierarchy recommendation.** In general prefer no more than two levels. "When a data hierarchy is deeper than two levels,
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
  every `.as-shortcut` it finds. ⌘ means Command on Apple platforms and Ctrl
  elsewhere; ⌃ is always Control. Opt-in, because a page that merely
  *displays* `⌘C` next to a Copy item must not hijack the real one. While a
  text field or rich-text editor has focus, its own editing keys win — select
  all, copy/cut/paste, undo/redo, arrow movement and deletion (plus ⌘B/⌘I/⌘U
  in rich text) — and other bound commands such as ⌘S still run. Do not print
  shortcuts the browser reserves (⌘/Ctrl+N, T, W, Q, Ctrl+Tab); on Windows
  and Linux ⌘R becomes Ctrl+R and replaces Reload. Every toolbar item should
  also exist as a menu command (`hig/toolbars.md`).

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

## Density

Pick the density from the product and its input, not from the viewport width,
and set it on `<html>` (dialogs and popovers render in the top layer, outside
any app container):

| | iOS default | `data-density="desktop"` | `data-platform="macos"` |
|---|---|---|---|
| For | phone/tablet-first UI, touch | cross-platform desktop web apps: consoles, dashboards, admin tools | an explicitly Mac-like application surface |
| Body text | 17/22 | **14/20** | **13/16** |
| `.as-button` | 44px, capsule | **32px**, capsule | **22px**, `--as-radius-xs` |
| Segmented control | 38px | **32px** | (iOS size) |
| Search field | 44px | **32px** | (window toolbar: 24px) |
| `.as-input` (text field, select) | 44px, 17px text | **32px**, 14px | **22px**, 13px |
| `.as-option` (listbox row) | 44px | **32px** | **28px** |
| `.as-menu-item`, sidebar and pane rows | 44px | **32px** | **28px** |
| Switch | 51×31 | **40×24** | (iOS size) |
| Large title | 34/41 | 28/34 | 26/32 |

`data-density="desktop"` is a project default, not an Apple specification. It
scales every component together, so a page has one density instead of 13px
panes next to 44px buttons. With touch input (`any-pointer: coarse`, which
includes touchscreen laptops) it keeps 44px targets, 16px field text (iOS
Safari zooms smaller inputs) and the touch-size switch and slider. Use either
it or `data-platform="macos"`, not both.

Inside `.as-split`, sidebar rows and inspector fields use `--as-row-min`
(28px; 32px with the desktop density), and `@media (any-pointer: coarse)` raises
it back to 44px — see the hit region note below. macOS keeps **capsules for Large/XL controls and standout
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

The library's fields: `.as-form` (grid), `.as-form-field` (label + control +
hint/error), `.as-form-label`, `.as-form-hint`, `.as-form-error`, `.as-form-row`
(label and a switch on one line) and `.as-input` on `<input>`, `<textarea>` and
`<select>`. They follow the density: 44px / 17px by default, 32px / 14px with
`data-density="desktop"`, 44px / 16px with touch, 22px / 13px with
`data-platform="macos"`.

```html
<form class="as-form" novalidate>
  <label class="as-form-field"><span class="as-form-label">Title</span>
    <input class="as-input" name="title" required autocomplete="off" aria-describedby="title-error">
    <span class="as-form-error" id="title-error" hidden>Enter a title.</span></label>
  <label class="as-form-field"><span class="as-form-label">Owner</span>
    <select class="as-input" name="owner"><option>Unassigned</option><option>Lin</option></select></label>
</form>
```

- A real `<label for>` (or a wrapping `<label>`) for every field; placeholder is a hint, never the label.
- `autocomplete` tokens (`email`, `new-password`, `one-time-code`…) and `inputmode`
  (`numeric`, `decimal`, `email`) — this is most of what makes a form feel native on
  iOS. `type="number"` only for true numbers, never phone or card fields.
- Font-size ≥ 16px on inputs or iOS Safari zooms on focus.
- Errors: `aria-describedby` pointing at the message, `aria-invalid="true"`, message
  next to the field in plain language saying how to fix it — not a red border alone
  (colour-only meaning fails contrast rules).
- Validate on blur and on submit, not on every keystroke; never block typing.
- `.as-input[aria-invalid="true"]` draws the red edge; the `.as-form-error`
  text is what carries the message. On a failed submit, focus the first invalid
  field.
- The field fill is the boundary (an iOS-style filled field); Increase Contrast
  adds a ≥ 3:1 edge. If your product requires an always-visible outlined field,
  override `border-color` on `.as-input`.

## Theming

- `color-scheme: light dark` on `:root` so form controls, scrollbars and the
  canvas follow the theme (already set). `light-dark()` for token values.
- Respect the system by default; if you offer a switch, persist it and apply the
  attribute **before first paint** (inline script in `<head>`) or you get a flash.
- `<meta name="theme-color">` with `media="(prefers-color-scheme: …)"` so mobile
  browser chrome matches.
- Test all four preference axes in DevTools → Rendering: `prefers-color-scheme`,
  `prefers-reduced-motion`, `prefers-contrast`, `prefers-reduced-transparency`,
  plus `forced-colors: active` (Windows contrast themes). Forced colours flatten
  backgrounds to `Canvas` and remove shadows, so any state you paint with a fill
  disappears. The stylesheet redraws switches, segmented selection, sliders and
  selected tabs/rows, selected listbox options, pills, skeletons and field
  edges with system colours (`Highlight`, `CanvasText`, `GrayText`); a custom
  control needs the same treatment.

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

- Loading: `.as-skeleton` blocks shaped like the rows (`--as-skeleton-h` sets
  the height), `aria-hidden="true"` on them and `aria-busy="true"` on the
  region; remove both when the data arrives. The pulse stops with Reduce Motion.
- Empty and error: `.as-empty` with an optional icon, `.as-empty-title`, one
  sentence, and the action that fixes it (`.as-button`). Toggle it with `hidden`.
- Status: `.as-pill` plus `.as-pill-info` / `-success` / `-warning` /
  `-critical` (neutral without one), `.as-pill-dot` for a leading dot. Every
  variant keeps ≥ 4.5:1 in both appearances; inside a selected option it turns
  white on the accent.

## Selectable lists and toasts (runtime)

`LiquidGlass.init()` upgrades every `.as-listbox` in scope; `listbox(el)` does
one. The page owns the data and renders the rows; the runtime owns the keyboard
model and the tab stop:

```html
<div class="as-listbox" id="tickets" aria-label="Tickets">
  <div class="as-option" aria-selected="true" tabindex="-1">Invoice does not match</div>
  <div class="as-option" tabindex="-1">Cannot sign in <span class="as-pill as-pill-warning">Waiting</span></div>
</div>
```

```js
tickets.addEventListener('change', () => show(tickets.querySelector('[aria-selected="true"]').id));
```

- Selection is `aria-selected`. To select from code, set `aria-selected="true"`
  on a row; the runtime clears the others (the newest wins) and moves the tab
  stop. Programmatic changes do not fire `change`.
- Re-rendering every row in a change handler is fine: the runtime gives new
  rows their role and tab stop, and if the focused row was replaced, focus moves
  to the new selected row instead of falling back to `<body>`.
- Render rows with `tabindex="-1"` if you focus one straight after rendering;
  the runtime sets the tab stop after the DOM mutation is delivered.
- `aria-disabled="true"` on an option skips it; on the list, disables it.
- Selected rows use `--as-action-bg` with white text, and `.as-secondary`,
  `.as-tertiary` and `.as-pill` inside them turn white too. Any other coloured
  text you put in a row needs the same treatment, in forced colours as well
  (`HighlightText`).

`LiquidGlass.toast(message, { duration = 2600 })` shows one message at a time
and returns `hide()`. It reuses a direct `.as-toast` child of the page or, when a
modal `<dialog>` is open, of that dialog — the page behind a modal is inert, and
an inert live region is never announced. Put an empty
`<div class="as-toast" role="status" aria-live="polite" aria-atomic="true"></div>`
in the page's markup: a live region created on demand can miss its first
message on some screen readers. A repeated message is announced again. With a
floating `.as-tabbar` the toast sits above the bar.

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
  `box-shadow` or `width` on elements in the page flow. The runtime makes two
  bounded exceptions: `morph()` resizes one fixed-position ghost that has no
  children (its layout cannot move anything else), and `materialize()` blurs
  small glass for under 400 ms — large glass and lite mode use scale and
  opacity only.
- The runtime's own budget: backdrop sampling (`adapt`) runs at most every
  120 ms while scrolling or resizing, plus once after movement stops;
  displacement maps are cached by size, radius and rim (48 entries), so
  scrolling glass in and out of view reuses them; DOM mutations only sweep
  registered components when nodes were removed. Browser tests count these
  (`elementsFromPoint`, `toDataURL`, `isConnected`) so regressions fail CI.
- `data-perf="lite"` on `<html>` disables lensing wholesale — ship it as an escape
  hatch for low-end devices and for `Save-Data`.
- A glass element placed directly in `.as-glass-group` is glass on glass: it is
  rendered flat (content stays visible) and the runtime logs a console warning.
  Group children are `.as-item`.

## Runtime lifecycle and frameworks

- `init(root = document)` includes the root element and its descendants. Repeated calls reuse bindings. The returned status object retains `attached`, `controls`, `shortcuts`, `lens` and adds `destroy()` for that root.
- Dynamic descendants inside an initialized root are upgraded automatically. Removed components are released after MutationObserver delivery; removing an initialized root destroys its scope. Reinserted roots need `init(root)` again; descendants reinserted under a live root are upgraded automatically.
- `detach(el)` releases the element/subtree's runtime bindings, generated knobs/indicators/filters and scheduled work. `destroy(root = document)` additionally stops initialization observers for that scope. Call cleanup before unmounting for deterministic teardown. Unrelated sibling roots remain active. An explicitly destroyed subtree is not immediately rebound by an initialized ancestor; explicitly initialize that component root to resume it.
- `attach(el, {scale, rim, chroma, lens, adapt})` attaches one glass surface, not its controls. Repeated calls merge explicit options. Numeric scale (including 0) and rim, chroma, lens:false and adapt:false survive resize, viewport re-entry and appearance regeneration. Omitted values retain previous choices. `data-lens="off"` / `data-adapt="off"` also opt out.
- Controls keep DOM state and emit bubbling `change`. Read `aria-checked`, `.is-selected`, or native range `value`. Do not independently toggle state again in `click`. Keep framework ownership boundaries stable; replace the subtree with destroy/init when changing the control's structural role.
- Native button switches generate keyboard click; custom switch hosts get keyboard activation. Pointer taps use click, drag commits once, and cancel/lost capture cancels selection. Tabs manage the linked panel's hidden state; authors provide labels and meaningful panel content.

Loading the runtime: copy `liquid-glass.js` **and** `liquid-glass.mjs` side by
side. A classic `<script src="liquid-glass.js">` sets `window.LiquidGlass`;
CommonJS `require()` returns the API; ES modules import
`liquid-glass.mjs` (`import LiquidGlass, { init } from './liquid-glass.mjs'`).
Importing is safe during server rendering, in workers and in DOM-less test
environments: without `document`, `matchMedia` and the observers, every
function is an inert no-op. Loading the script and the module on one page
shares a single runtime.

React:

```jsx
import { init } from './liquid-glass.mjs';

function GlassControls() {
  const root = React.useRef(null);
  React.useEffect(() => {
    const element = root.current;
    const runtime = init(element);
    return () => runtime.destroy(); // also safe in Strict Mode's effect replay
  }, []);
  return <div ref={root}><button className="as-toggle" role="switch"
    aria-checked="false" aria-label="Wi-Fi"><span className="as-knob" /></button></div>;
}
```

Vue:

```vue
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { init } from './liquid-glass.mjs';
const root = ref(null);
let runtime;
onMounted(() => { runtime = init(root.value); });
onBeforeUnmount(() => { runtime?.destroy(); });
</script>
<template>
  <div ref="root"><button class="as-toggle" role="switch" aria-checked="false"
    aria-label="Wi-Fi"><span class="as-knob" /></button></div>
</template>
```

SSR: call the runtime only after mounting in the browser. CSS supplies the static appearance, but custom switches/segmented controls require JS for interaction; native ranges keep native behavior. Framework snippets are integration guidance, not a claim of an executed React/Vue application test.

Cascade layers and Tailwind: `apple-style.css` ships unlayered, so a plain `<link>` keeps working next to unlayered resets. Unlayered rules beat every layered rule, though, so Tailwind v4 utilities (which live in `@layer utilities`) cannot adjust an `as-*` component until the stylesheet is imported into a layer below them:

```css
@import "tailwindcss";
@import "./apple-style.css" layer(components);   /* after base/preflight, before utilities */
```

Without Tailwind, declare the order yourself — `@layer base, apple-style, utilities;` followed by `@import url("apple-style.css") layer(apple-style);` (in a stylesheet or a `<style>` block; `<link>` cannot assign a layer). Keep the stylesheet rather than rebuilding blur with `backdrop-blur-*`.

## Verify before shipping

Light + dark · Increase Contrast · Reduce Transparency · Reduce Motion · largest
Dynamic Type · keyboard only · VoiceOver/NVDA · RTL · slow 3G · over dark *and*
light content · Safari and Firefox (no lensing there — confirm the fallback
still reads as a material). **Widths: 320 · 390 · 768 · 1024 · 1440 · 2000** —
a design checked only at one width is how a page ends up with dead gutters at
2000 or a squeezed detail column at 1024. Record checked / not checked / not applicable with commands, browser and revision in `../../Apple-Style-Review/SKILL.md`. Reading the checklist is not runtime validation.
