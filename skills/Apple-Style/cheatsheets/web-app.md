# Web app — components, windows and runtime contracts

Scope: [rule strength and evidence](rules-and-evidence.md). Web applications and the deliberate Mac-like window. Rules for every web page (semantics basics, layout, input, theming, media, performance, verification) are in [web-implementation.md](web-implementation.md); read that first. Content websites do not need this file.

## Semantics & ARIA for app components

| Component | Markup |
|---|---|
| Segmented control | `role="tablist"` + `role="tab"` `aria-selected` when it swaps views; `role="radiogroup"` + `role="radio"` `aria-checked` when it picks a value. Roving `tabindex` (one enabled item `0`, rest `-1`); arrows move focus and, by default, selection. Tabs require linked panels; `data-activation="manual"` defers selection to Enter/Space. Disabled items are skipped. |
| Sheet / alert | `<dialog>` (or `role="dialog"`/`alertdialog` + `aria-modal`), `aria-labelledby` the title. Trap focus, `inert` the background, **Escape closes**, restore focus to the opener on close. |
| Modal dialog (`.as-dialog`) | `<dialog class="as-dialog" aria-labelledby>` opened with `showModal()` — the browser supplies all four of the sheet requirements above. Header, body, footer; footer actions trailing, primary last. A Cancel button inside the form is `type="button"`: the first submit button is the form's default, and Enter must not cancel. |
| Selectable list (`.as-listbox`) | `role="listbox"` + `role="option"` `aria-selected`, `aria-label` on the list. Single select: one tab stop on the selection; Up/Down (Left/Right with `aria-orientation="horizontal"`), Home/End and type-ahead move it; `data-activation="manual"` moves focus only and Space/Enter selects. No interactive content inside an option. Rows that need columns or row actions are a grid or a table instead. |
| Toast | `role="status"` (polite, atomic) — `LiquidGlass.toast()` creates it. For confirmations only; never the only place an error or an action appears. Errors go next to the field or in an alert. |
| Menu | `role="menu"`/`menuitem`, opener has `aria-haspopup="menu"` + `aria-expanded`. Up/Down move, Escape closes and returns focus, Tab closes. If it is really a listbox or a nav popover, use those roles instead — the menu keyboard model is a contract. |
| Toolbar | `role="toolbar"` with arrow-key navigation; every icon-only button needs an accessible name. |
| Glass group | Decorative container — do **not** give it a role; the buttons inside carry the semantics. |

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

Verification for these components is in [web-implementation.md](web-implementation.md), *Verify before shipping*.
