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
  (margins 20). Prefer **container queries** for components that appear in both a
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
  numbers: content `0`, scroll edge `10`, sidebar `15`, tab bar `20`, sheet backdrop
  `30` / sheet `31`, menu/popover `40`, alert `41`, toast `60`. A new overlay picks
  the band it belongs to.

## Input, pointer and scrolling

- `touch-action` on anything you drag (`pan-y` for a horizontal scrubber) or the
  browser steals the gesture. Use Pointer Events + `setPointerCapture`, not
  mouse/touch pairs.
- Gate hover affordances behind `@media (hover: hover)`; on `(pointer: coarse)`
  enforce the 44×44 target even when the visual is smaller (pad the hit area).
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
Dynamic Type · keyboard only · VoiceOver/NVDA · RTL · 320px wide · slow 3G ·
over dark *and* light content · Safari and Firefox (no lensing there — confirm the
fallback still reads as a material). Then run the checklist in
`../Apple-Style-Review/SKILL.md`.
