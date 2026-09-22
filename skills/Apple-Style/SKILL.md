---
name: Apple-Style
description: Use when building or restyling a UI that should look and behave like Apple's platforms — Liquid Glass, iOS 26 / macOS 26 design system, Human Interface Guidelines compliance, SF typography, system colors, floating tab bars/toolbars/sidebars, sheets, menus — for web (HTML/CSS/JS, React, Vue, Tailwind), SwiftUI, UIKit or AppKit. Also use when the user says "Apple style", "Liquid Glass", "HIG", "like iOS", "like macOS", "Cupertino", or asks whether a design follows Apple guidelines.
---

# Apple-Style

Entry point of a four-skill set that reproduces Apple's design guidance (developer.apple.com/design) and the Liquid Glass material as working code.

| Skill | Use it for |
|---|---|
| **Apple-Style** (this) | Workflow, decisive rules, tokens, the web implementation (`web/`) |
| **Apple-Style-Liquid-Glass** | Implementing/tuning the material itself (web CSS/JS or native APIs) |
| **Apple-Style-HIG** | Looking up exact guidance: 172 HIG pages, Liquid Glass developer docs, 9 WWDC25 transcripts |
| **Apple-Style-Review** | Auditing an existing UI against the HIG and producing a fix list |

Paths below are relative to this skill's directory; sibling skills live at `../Apple-Style-*`.

## Workflow

1. **Classify every element into two layers** before styling anything: *content layer* (lists, cards, text, media, backgrounds → solid colors or standard materials) and *navigation/control layer* (bars, tabs, sidebars, sheets, menus, primary buttons → Liquid Glass). If you cannot name the layer, it is content.
2. **Load the cheatsheets you need**: `cheatsheets/materials-and-liquid-glass.md` (always), **`web-implementation.md` (always, when the target is web)**, then `color.md`, `typography.md`, `layout-and-shapes.md`, `components-quickref.md`, `motion-and-interaction.md`, `accessibility-and-inclusion.md`, `design-principles.md`.
3. **When a rule or number matters, read the source page** instead of guessing: `../Apple-Style-HIG/reference/INDEX.md`, or `scripts/hig-lookup.sh <keyword>` / `--rules <slug>`.
4. **Build**: web → copy `web/apple-style.css` + `web/liquid-glass.js` into the project and compose the `as-*` classes (see `web/demo.html`); native → use the system components and modifiers listed in the cheatsheet; only then add custom glass, sparingly.
5. **Verify** in light + dark, Reduce Transparency, Increase Contrast, Reduce Motion, largest Dynamic Type, over both light and dark content, **and at several window widths (390 / 768 / 1024 / 1440 / 2000)** — a layout checked at one width is how a page ends up with dead gutters on a wide display or a squeezed detail column at 1024. Run the checklist in `../Apple-Style-Review/SKILL.md` before declaring done.

## Decisive rules (violating any one makes it "not Apple")

- Liquid Glass only on the floating control/navigation layer; **never in content, never glass on glass, never everywhere.** Content-layer controls (slider/toggle knobs) become glass only while touched.
- **Regular** variant by default. **Clear** only over media, only with bold bright content on top, with a 35% dim layer if the background is bright. Never mix the two.
- **Remove custom bar backgrounds, borders, dividers and dark overlays.** Separation comes from glass + the **scroll edge effect**, not from decoration. Hierarchy comes from layout and grouping.
- **Tint = one primary action** (background tinted, label white). Bar icons stay monochrome. Brand color lives in the content layer.
- Toolbar items **share one glass background per group**; don't mix icons and text in one group; primary action stands alone.
- **Shapes**: capsules for touch controls and bars — **on macOS only for Large/XL controls and standout actions; mini/small/medium stay rounded rectangles**; **concentric** radius (parent − inset) for anything nested; fixed only when standalone. Pinched or flared corners are bugs.
- **Hit targets 44×44 pt with a finger, ≥ 24×24 px with a pointer** (WCAG 2.2) — gate on the input (`any-pointer: coarse`), not the screen width. SF text styles with Dynamic Type, semantic colors that adapt to Dark Mode and Increase Contrast, 4.5:1 contrast.
- **Desktop target (≥1024px): set `data-platform="macos"` first and build a window, not a page.** That attribute is the density switch (13/16 body, 22px buttons, 28px menu items, `--as-radius-xs`); without it you ship phone metrics on a Mac. Navigation is the **leading sidebar**, extra detail is the **trailing inspector**, and **nothing critical sits on the bottom edge of the window** (`hig/layout.md` macOS, `hig/windows.md`). `≥768px` is the iPad tier; `≥1024px` is a third tier, not "more regular".
- **Bolder, left-aligned** titles in alerts/sheets/onboarding; title-style section headers (no ALL CAPS).
- **Motion**: springs, interruptible, materialize (not fade), menus/sheets/dialogs **morph out of the control** that opened them; honor Reduce Motion.
- **Controls are drag targets, not just tap targets.** Segmented control (press the selected segment and slide), switch (throw the knob), slider (scrub the thumb) all track the pointer 1:1, stretch with the drag and settle on a spring. A click-only reimplementation is the most common tell that a UI is not Apple. Content-layer knobs **lift into glass only while held**.
- Search: dedicated trailing search tab on iPhone or top-trailing toolbar field on iPad/Mac; tab bar may minimize on scroll.
- Prefer system components. Custom glass is the exception and must reimplement adaptivity + accessibility modifiers.

## Web quick start

Pick the skeleton by tier first. **Compact / iPad (`<1024px`)**: floating tab
bar at the bottom, content scrolling under a scroll-edge toolbar.
**Desktop (`≥1024px`)**: a window — sidebar, split view, inspector, and nothing
critical on the bottom edge. They are different skeletons, not one skeleton
with different margins.

```html
<link rel="stylesheet" href="apple-style.css">
<button class="as-glass as-glass-interactive as-button as-button-glass">Regular</button>
<button class="as-glass as-glass-interactive as-glass-prominent as-button as-button-glass">Done</button>
<div class="as-glass as-glass-group"><button class="as-item is-selected">Day</button><button class="as-item">Week</button></div>
<!-- data-sidebar: the same tab bar becomes a left sidebar at ≥1024px (one element that scales).
     Put .as-with-tabsidebar on whatever owns the page padding. -->
<nav class="as-tabbar" data-minimize data-sidebar><div class="as-glass as-glass-group" role="tablist">…tabs…</div><div class="as-glass as-glass-group"><button class="as-tab as-tab-search">🔍</button></div></nav>
<header class="as-scroll-edge as-edge-top"><div class="as-toolbar">
  <div class="as-toolbar-title" data-reveal-on-scroll>Landmarks</div>  <!-- appears only after .as-large-title scrolls away -->
  …glass groups…</div></header>
<div class="as-glass as-glass-large as-sheet">…</div>     <!-- large glass: sidebar/menu/sheet/alert -->

<!-- Scrubbable controls: plain markup, init() adds the drag gesture -->
<div class="as-segmented" role="tablist"><button class="as-segment is-selected" role="tab">Map</button><button class="as-segment" role="tab">Transit</button></div>
<button class="as-toggle" role="switch" aria-checked="true" aria-label="Wi-Fi"><span class="as-knob"></span></button>
<input class="as-slider" type="range" min="0" max="100" value="62" aria-label="Volume">

<script src="liquid-glass.js"></script><script>LiquidGlass.init()</script>
```

Desktop skeleton (`≥1024px`, `<html data-platform="macos">`) — see
`web/demo-desktop.html` for the working page:

```html
<!-- A window, not a page. Navigation is the leading sidebar, detail is the
     trailing inspector, and nothing critical sits on the bottom edge:
     "People often move windows so that the bottom edge is below the bottom of
     the screen" (hig/layout.md macOS; hig/windows.md sends the overflow to an
     inspector "on the trailing side of a split view"). -->
<div class="as-window">
  <div class="as-menubar" role="menubar" data-shortcuts>…</div>   <!-- optional, in-window; printed ⌘-combos get wired -->
  <header class="as-toolbar as-toolbar-window">                   <!-- part of the window frame, not a floating bar -->
    <!-- .as-toolbar-group, NOT .as-glass-group: "toolbar items don't include
         a bezel" on macOS — the frame is already the container, and a glass
         pill on a blurred frame is also glass on glass. -->
    <div class="as-toolbar-group">…show/hide sidebar…</div>
    <h1 class="as-toolbar-title">Window title</h1>                <!-- inline with the controls (hig/toolbars.md macOS) -->
    <div class="as-spacer"></div>
    <div class="as-toolbar-group">…content actions…</div>         <!-- ≤3 groups; group by function -->
    <div class="as-toolbar-group">…inspector toggle…</div>        <!-- view commands, kept separate -->
    <div class="as-search"><input type="search"></div>            <!-- top-trailing on Mac, not a search tab -->
    <button class="as-button as-button-filled as-button-small">Done</button>   <!-- one primary action -->
  </header>
  <div class="as-split">
    <aside class="as-sidebar">…≤ two levels (hig/sidebars.md)…</aside>
    <div class="as-split-divider"></div>                          <!-- init() adds separator role, drag + arrow keys -->
    <main class="as-content">…fills the column; limit prose with .as-readable…</main>
    <div class="as-split-divider"></div>
    <aside class="as-inspector">…</aside>
  </div>
</div>
```

Widths come from `--as-sidebar-w` / `--as-inspector-w` / `--as-content-min`
(264/380/480 at ≥1280, 220/300/380 at 1024–1280 — starting points, measured,
not Apple's; see `cheatsheets/web-implementation.md` → *Desktop windows*).
Below 1024px the same markup degrades to stacked panes; that is a fallback,
not a design — ship the compact skeleton there.

`LiquidGlass.init()` owns the state of `.as-segmented` / `.as-toggle` / `.as-slider` — it adds the drag gesture, the sliding indicator and the lens knob, then emits a bubbling **`change`** event. Listen for `change` and read the element (`aria-checked`, `.is-selected`, `input.value`); do **not** add your own click handler, or the control toggles twice. Without JS the same markup still works as a click-only control.

Tokens: `--as-accent`, system colors `--as-blue … --as-brown`, semantics `--as-label`, `--as-bg-grouped-2`, `--as-fill`, type classes `.as-text-body … .as-text-largetitle`, radii `--as-radius-*`, springs `--as-ease-spring`. `data-theme="light|dark"`, **`data-platform="macos"` (the desktop density switch — 13/16 body, 22px buttons, 28px menu items; set it for every desktop target)**, `data-liquid-glass="tinted"` on `<html>`. Tailwind/React: keep the CSS file as-is and apply the classes; do not re-implement blur with arbitrary utilities.

Preview a standalone page: `python3 -m http.server 8765 --directory <dir>` then open `http://localhost:8765/<file>.html` (lensing needs Chromium; `file://` also works but some browsers block canvas sampling).

## Common mistakes

| Mistake | Fix |
|---|---|
| Glass cards, glass list rows, glass page background | Content layer → `--as-bg-grouped-2` / `.as-material` |
| A bottom tab bar on a 1440px desktop target | Compact-width component on the wrong tier. `.as-window` + leading `.as-sidebar`; "avoid placing controls or critical information at the bottom of a window" (`hig/layout.md` macOS) |
| `max-width: 1280px` (or the 672pt readable width) on the whole page | 340px of dead gutter each side at 2000px. The readable width is for **running text**: tables and lists fill their column, prose gets `.as-readable` inside it |
| A desktop window built entirely of 44pt capsules | Set `data-platform="macos"`; pointer targets are ≥24px (WCAG 2.2), and macOS capsules are for Large/XL and standout actions only |
| A resize handle that is a `<div>` with a `mousedown` listener | `.as-split-divider` + `LiquidGlass.init()`: `role="separator"`, focusable, arrow keys, and `aria-valuenow` equal to the width actually drawn |
| A menu item printing `⌘S` that does nothing when you press ⌘S | `data-shortcuts` on `.as-menubar` binds every `.as-shortcut` it finds |
| Toolbar title centered over the bar, or a second copy of the page heading | On Mac the title is **inline with the controls** on the leading edge (`hig/toolbars.md`) |
| Glass pills in a **window** toolbar | "Toolbar items don't include a bezel" on macOS — the frame is the container, and glass on a blurred frame is glass on glass. `.as-toolbar-group` (bare symbols, hover/selection states), not `.as-glass-group` |
| Secondary text dimmed to 70–80% white on an accent-filled selected row | It lands ~2.8:1 — *below* the primary label. White on system blue is already ~3.3:1 (the system's own value and the ceiling here); go opaque, and let Increase Contrast drop the accent for black/white |
| A glass button inside a glass toolbar group | Group is the glass; children are `.as-item` |
| Semi-opaque white/black bar background + 1px border | Delete it; use `.as-scroll-edge` |
| Every button tinted brand color | One `as-glass-prominent`; rest regular |
| `border-radius: 16px` on artwork inside a 26px card with 12px padding | 14px (concentric) |
| A selected-row **highlight** inside a glass group / sidebar left on a small fixed radius | Same rule, and it is the most visible case: radius = group radius − group padding. Drive it from the tokens (`calc(var(--as-glass-radius) - <pad>)`) so it survives a retune |
| A **tall or large** glass surface left on the default capsule radius | `.as-glass` defaults to a capsule, which is only right for short horizontal controls — a 216×198 capsule is a 99px lozenge, not a sidebar. Set `--as-glass-radius` (`as-glass-large` and `.as-tabbar[data-sidebar]` already do) |
| Menu items / sidebar rows as `<div role="menuitem">` | Use `<button>`/`<a>` — the menu keyboard model needs focusable items; the CSS resets the UA button chrome for you |
| Compact toolbar title on screen while the large title is still visible | Same words twice: `data-reveal-on-scroll` on `.as-toolbar-title` |
| `outline: none` on an input inside glass with no replacement ring | Keyboard users lose the field. Ring the glass container via `:focus-within` / `:focus-visible` with `outline` + `outline-offset` (never `box-shadow` — glass owns that) |
| Destructive action with neither confirmation nor undo | Irreversible → alert/action sheet, red destructive button, Cancel is the default; reversible → do it and offer **Undo** in a toast |
| `transition: all .3s ease-in-out` | `transform`/`opacity` only, `--as-ease-spring` |
| Uppercase section headers, centered alert text | Title case; left-aligned bold |
| Segmented control / switch / slider that only responds to clicks | Let `LiquidGlass.init()` own them; they must track a drag and stretch with it |
| Knob styled as glass at rest | Glass only while held (`.is-scrubbing`); quiet white at rest |
| Skipping `prefers-reduced-transparency/contrast/motion` | CSS already handles them — don't override `.as-glass` backgrounds with `!important` |
| SF Symbols / SF fonts shipped on a website | Not licensed for web — draw 24×24 / 1.8-stroke SVG, keep `-apple-system` as a stack (`web-implementation.md`) |
| `will-change: transform` on every glass element | Promote only what is moving; blanket promotion is what drops frames |
| Gloss gradient across the glass, double bevel, thick bright outline | Light is **bent, not painted** — clean interior, 1px rim, let refraction do the work |
| `100vh` full-height layout, missing `touch-action` on a scrubber | `100dvh`; `touch-action: pan-y` or the browser eats the gesture |
| Hard-coding `#007AFF` | `var(--as-blue)` (0 136 255 light / 0 145 255 dark) |

## Files
- `cheatsheets/` — 9 dense summaries with the exact numbers. `web-implementation.md` is the web-only layer: ARIA mapping per component, focus/keyboard, the three breakpoint tiers, **desktop windows and macOS density**, forms, theming, media, the z-index scale, the performance budget and the two licensing traps (SF Symbols and SF fonts are **not** usable on the web).
- `web/apple-style.css` (tokens + type + colors + materials + Liquid Glass + components + a11y + the tab-bar→sidebar form + the **desktop window layer**: `.as-window`, `.as-menubar`, `.as-toolbar-window`, `.as-split`, `.as-split-divider`, `.as-list-column`, `.as-inspector`), `web/liquid-glass.js` (lensing with chromatic dispersion, travelling specular highlight, gel flex, backdrop adaptivity, morph/materialize, scrubbable controls, tab-bar minimize, title-on-scroll, concentric, **resizable split dividers and menu-bar shortcuts**), `web/demo.html` (compact/iPad: every component) and `web/demo-desktop.html` (the desktop window at 1024/1440/2000) — both verified in Chromium.
- `scripts/hig-lookup.sh`, `scripts/update-reference.sh` (+ `docc2md.py`, `crawl.py`, `transcript.py`) to search/refresh the Apple-Style-HIG library.
