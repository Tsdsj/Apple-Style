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
5. **Verify** in light + dark, Reduce Transparency, Increase Contrast, Reduce Motion, largest Dynamic Type, and over both light and dark content. Run the checklist in `../Apple-Style-Review/SKILL.md` before declaring done.

## Decisive rules (violating any one makes it "not Apple")

- Liquid Glass only on the floating control/navigation layer; **never in content, never glass on glass, never everywhere.** Content-layer controls (slider/toggle knobs) become glass only while touched.
- **Regular** variant by default. **Clear** only over media, only with bold bright content on top, with a 35% dim layer if the background is bright. Never mix the two.
- **Remove custom bar backgrounds, borders, dividers and dark overlays.** Separation comes from glass + the **scroll edge effect**, not from decoration. Hierarchy comes from layout and grouping.
- **Tint = one primary action** (background tinted, label white). Bar icons stay monochrome. Brand color lives in the content layer.
- Toolbar items **share one glass background per group**; don't mix icons and text in one group; primary action stands alone.
- **Shapes**: capsules for touch controls and bars; **concentric** radius (parent − inset) for anything nested; fixed only when standalone. Pinched or flared corners are bugs.
- **44×44 pt hit targets**, SF text styles with Dynamic Type, semantic colors that adapt to Dark Mode and Increase Contrast, 4.5:1 contrast.
- **Bolder, left-aligned** titles in alerts/sheets/onboarding; title-style section headers (no ALL CAPS).
- **Motion**: springs, interruptible, materialize (not fade), menus/sheets/dialogs **morph out of the control** that opened them; honor Reduce Motion.
- **Controls are drag targets, not just tap targets.** Segmented control (press the selected segment and slide), switch (throw the knob), slider (scrub the thumb) all track the pointer 1:1, stretch with the drag and settle on a spring. A click-only reimplementation is the most common tell that a UI is not Apple. Content-layer knobs **lift into glass only while held**.
- Search: dedicated trailing search tab on iPhone or top-trailing toolbar field on iPad/Mac; tab bar may minimize on scroll.
- Prefer system components. Custom glass is the exception and must reimplement adaptivity + accessibility modifiers.

## Web quick start

```html
<link rel="stylesheet" href="apple-style.css">
<button class="as-glass as-glass-interactive as-button as-button-glass">Regular</button>
<button class="as-glass as-glass-interactive as-glass-prominent as-button as-button-glass">Done</button>
<div class="as-glass as-glass-group"><button class="as-item is-selected">Day</button><button class="as-item">Week</button></div>
<nav class="as-tabbar" data-minimize><div class="as-glass as-glass-group" role="tablist">…tabs…</div><div class="as-glass as-glass-group"><button class="as-tab as-tab-search">🔍</button></div></nav>
<header class="as-scroll-edge as-edge-top"><div class="as-toolbar">…glass groups…</div></header>
<div class="as-glass as-glass-large as-sheet">…</div>     <!-- large glass: sidebar/menu/sheet/alert -->

<!-- Scrubbable controls: plain markup, init() adds the drag gesture -->
<div class="as-segmented" role="tablist"><button class="as-segment is-selected" role="tab">Map</button><button class="as-segment" role="tab">Transit</button></div>
<button class="as-toggle" role="switch" aria-checked="true" aria-label="Wi-Fi"><span class="as-knob"></span></button>
<input class="as-slider" type="range" min="0" max="100" value="62" aria-label="Volume">

<script src="liquid-glass.js"></script><script>LiquidGlass.init()</script>
```

`LiquidGlass.init()` owns the state of `.as-segmented` / `.as-toggle` / `.as-slider` — it adds the drag gesture, the sliding indicator and the lens knob, then emits a bubbling **`change`** event. Listen for `change` and read the element (`aria-checked`, `.is-selected`, `input.value`); do **not** add your own click handler, or the control toggles twice. Without JS the same markup still works as a click-only control.

Tokens: `--as-accent`, system colors `--as-blue … --as-brown`, semantics `--as-label`, `--as-bg-grouped-2`, `--as-fill`, type classes `.as-text-body … .as-text-largetitle`, radii `--as-radius-*`, springs `--as-ease-spring`. `data-theme="light|dark"`, `data-platform="macos"`, `data-liquid-glass="tinted"` on `<html>`. Tailwind/React: keep the CSS file as-is and apply the classes; do not re-implement blur with arbitrary utilities.

Preview a standalone page: `python3 -m http.server 8765 --directory <dir>` then open `http://localhost:8765/<file>.html` (lensing needs Chromium; `file://` also works but some browsers block canvas sampling).

## Common mistakes

| Mistake | Fix |
|---|---|
| Glass cards, glass list rows, glass page background | Content layer → `--as-bg-grouped-2` / `.as-material` |
| A glass button inside a glass toolbar group | Group is the glass; children are `.as-item` |
| Semi-opaque white/black bar background + 1px border | Delete it; use `.as-scroll-edge` |
| Every button tinted brand color | One `as-glass-prominent`; rest regular |
| `border-radius: 16px` on artwork inside a 26px card with 12px padding | 14px (concentric) |
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
- `cheatsheets/` — 9 dense summaries with the exact numbers. `web-implementation.md` is the web-only layer: ARIA mapping per component, focus/keyboard, breakpoints, forms, theming, media, the z-index scale, the performance budget and the two licensing traps (SF Symbols and SF fonts are **not** usable on the web).
- `web/apple-style.css` (tokens + type + colors + materials + Liquid Glass + components + a11y), `web/liquid-glass.js` (lensing with chromatic dispersion, travelling specular highlight, gel flex, backdrop adaptivity, morph/materialize, scrubbable controls, tab-bar minimize, concentric), `web/demo.html` (every component, verified in Chromium).
- `scripts/hig-lookup.sh`, `scripts/update-reference.sh` (+ `docc2md.py`, `crawl.py`, `transcript.py`) to search/refresh the Apple-Style-HIG library.
