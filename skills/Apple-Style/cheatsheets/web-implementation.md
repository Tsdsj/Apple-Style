# Web implementation — the last mile from HIG rules to shipped code

Scope: [rule strength and evidence](rules-and-evidence.md). Platform recommendations, project defaults and visual heuristics are distinct; apply the cited platform section.

Web apps and content websites differ at the component level. Web-app parts (windows, density, states, lists, dialogs, toasts and runtime lifecycle) are in [web-app.md](web-app.md). Content websites start with [website.md](website.md).

The other cheatsheets carry Apple's design rules. This one carries what the web
needs on top of them, and the places where a literal reading of the HIG produces
broken or illegal web code. Web apps pair it with `web/apple-style.css` + `web/liquid-glass.js`; content websites copy only the core layers ([website.md](website.md), *Loading*). The stylesheet is edited in `web/css/*.css`; `web/apple-style.css` and `web/apple-style.min.css` are generated from those files by `scripts/build-css.py`.

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

Shared components only. App components (segmented control, sheet, modal dialog, listbox, toast, menu, toolbar, glass group) are in [web-app.md](web-app.md).

| Component | Markup |
|---|---|
| Tab bar | `<nav>` + links, **not** `role="tablist"` — it navigates between sections. `aria-current="page"` on the active tab. `role="tablist"` only for in-page views that swap content. |
| Toggle | `role="switch"` + `aria-checked`, or a real `<input type="checkbox" role="switch">`. Use a stable label such as “Wi-Fi”, independent of the checked state. The runtime upgrades `.as-toggle` button/custom hosts, not native checkbox state. |
| Slider | Real `<input type="range">` — never rebuild it; you lose keyboard, AT and `aria-valuetext` for free. Add `aria-valuetext` when the number needs units. |
| Pop-up button | A real `<select class="as-input">`. The stylesheet opts into customizable select (`appearance: base-select`) for pointer input and keeps the platform picker elsewhere. A pull-down *command* menu is a menu button, not a select. |
| Status pill (`.as-pill`) | Plain text in a `<span>` — the word carries the status; the colour repeats it. |

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

Density values for these fields (44 / 32 / 22 px and the font sizes) are in [web-app.md](web-app.md), *Density*.

The library's fields: `.as-form` (grid), `.as-form-field` (label + control +
hint/error), `.as-form-label`, `.as-form-hint`, `.as-form-error`, `.as-form-row`
(label and a switch on one line) and `.as-input` on `<input>`, `<textarea>` and
`<select>`. They follow the density: 44px / 17px by default, 32px / 14px with
`data-density="desktop"`, 44px / 16px with touch, 22px / 13px with
`data-platform="macos"`.

```html
<form class="as-form" novalidate>
  <div class="as-form-field"><label class="as-form-label" for="title">Title</label>
    <input class="as-input" id="title" name="title" required autocomplete="off" aria-describedby="title-error">
    <span class="as-form-error" id="title-error" hidden>Enter a title.</span></div>
  <label class="as-form-field"><span class="as-form-label">Owner</span>
    <select class="as-input" name="owner"><option>Unassigned</option><option>Lin</option></select></label>
</form>
```

- A real `<label for>` (or a wrapping `<label>`) for every field; placeholder is a hint, never the label.
  Keep the error and hint outside the `<label>`: text inside a label becomes part of the field's
  accessible name, so a shown error would be read as the name. Reference them with `aria-describedby`.
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
- `.as-input` draws a default edge (`--as-field-border`) with ≥ 3:1 against the page
  and the field fill in both appearances (WCAG 1.4.11); Increase Contrast strengthens it.
  If you override `border-color` or the fill, re-measure.

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

## Stylesheet layers

Cascade layers and Tailwind: `apple-style.css` ships unlayered, so a plain `<link>` keeps working next to unlayered resets. Unlayered rules beat every layered rule, though, so Tailwind v4 utilities (which live in `@layer utilities`) cannot adjust an `as-*` component until the stylesheet is imported into a layer below them:

```css
@import "tailwindcss";
@import "./apple-style.css" layer(components);   /* after base/preflight, before utilities */
```

Without Tailwind, declare the order yourself — `@layer base, apple-style, utilities;` followed by `@import url("apple-style.css") layer(apple-style);` (in a stylesheet or a `<style>` block; `<link>` cannot assign a layer). Keep the stylesheet rather than rebuilding blur with `backdrop-blur-*`.

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

## Verify before shipping

Light + dark · Increase Contrast · Reduce Transparency · Reduce Motion · largest
Dynamic Type · keyboard only · VoiceOver/NVDA · RTL · slow 3G · over dark *and*
light content · Safari and Firefox (no lensing there — confirm the fallback
still reads as a material). **Widths: 320 · 390 · 768 · 1024 · 1440 · 2000** —
a design checked only at one width is how a page ends up with dead gutters at
2000 or a squeezed detail column at 1024. Record checked / not checked / not applicable with commands, browser and revision in `../../Apple-Style-Review/SKILL.md`. Reading the checklist is not runtime validation. Content pages: run the Website checklist in `../../Apple-Style-Review/SKILL.md`, and read `website.md` → Verification note before judging large glass.
