---
name: Apple-Style-Review
description: Use when auditing, reviewing or critiquing an existing screen, component, stylesheet or app against Apple's Human Interface Guidelines and the Liquid Glass design system — "does this look/feel like Apple", "HIG compliance check", "why does my glass UI look wrong", App Store design polish, or before shipping an Apple-style web or native UI built with the Apple-Style skills.
---

# Apple-Style-Review

Read-only audit that produces a prioritized fix list. Uses **Apple-Style** cheatsheets for rules and **Apple-Style-HIG** for citations. Do not fix while auditing; report first, then fix on request (or immediately if the user asked for fixes).

## Procedure
1. **Inventory**: list every surface and control on the screen and assign each to *content layer* or *control/navigation layer*. Anything glass in the content layer is finding #1.
2. **Run the checklist** below; for each failure write: element → rule violated → HIG page (`../Apple-Style-HIG/reference/hig/<slug>.md`) → concrete fix (token/class/API). Severity: **Blocker** (breaks the material or accessibility), **Major** (looks un-Apple), **Minor** (polish).
3. **Check states**: light, dark, Increase Contrast, Reduce Transparency, Reduce Motion, largest Dynamic Type, RTL, keyboard focus, hover (pointer platforms), over dark *and* light content, empty/loading/error states.
4. **Report** as a table sorted by severity, then a 3–5 line summary of what would most change the impression. Quote the HIG sentence when the user might push back.

## Checklist

**Layering & material**
- [ ] Glass only on floating controls/navigation; none on cards, rows, page bg (`materials`)
- [ ] No glass on glass; toolbar/tab items share one background per group (`toolbars`, `tab-bars`)
- [ ] Regular by default; clear only over media with bold bright content and dimming; never mixed
- [ ] No custom bar backgrounds/borders/dark overlays; scroll edge effect present under pinned bars, one per view, soft (iOS) / hard (macOS pinned headers)
- [ ] Large glass (sidebar/menu/sheet) thicker & non-flipping; small glass flips light/dark with content
- [ ] Sheets inset with large radius, opaque at full height; menus/sheets/dialogs morph from their source control
- [ ] Standard materials + vibrant labels used in the content layer where translucency is needed

**Color**
- [ ] One tinted primary action (background tinted, white label); bar icons monochrome; brand color in content layer (`color`)
- [ ] Semantic colors (label/secondaryLabel/separator/backgrounds/fills) — no hard-coded grays/#007AFF
- [ ] Light + dark + increased-contrast variants for custom colors; ≥ 4.5:1 text contrast; no color-only meaning

**Typography**
- [ ] SF text styles with correct size/leading/weight (`typography` tables); Dynamic Type reflow to AX5; ≥ 11pt
- [ ] Bold, left-aligned titles in alerts/sheets/onboarding; title-style section headers (no ALL CAPS); title case buttons, sentence case body

**Shape & layout**
- [ ] 44×44 pt targets (60 visionOS); ≥ 8pt between controls; 16/20pt margins; safe areas respected; content extends under bars
- [ ] Capsules for touch controls/bars; concentric radii for nested shapes (no pinched/flared corners); macOS small controls rounded-rect, large/XL capsule
- [ ] Layout driven by size classes; tab bar ↔ sidebar adaptation; arbitrary window sizes; split views for columns
- [ ] Toolbar grouping by function; no icon+text in one group; primary action separate & tinted; overflow into More menu
- [ ] Search placement: trailing search tab (iPhone) / top-trailing field (iPad, Mac)

**Motion & feedback**
- [ ] Press state on every button; springs, interruptible, transform/opacity only; materialize not fade
- [ ] Glass **flexes** on press (gel, ~+6%) and illuminates from under the pointer, spreading to nearby glass; the specular highlight **travels around the silhouette** rather than sitting on one edge
- [ ] Segmented control, switch and slider are **draggable**, not click-only: 1:1 tracking, live selection during the drag, stretch with velocity, spring on release (`segmented-controls`, `sliders`, `toggles`)
- [ ] Knobs lift into glass **only while manipulated**; quiet at rest
- [ ] Reduce Motion honored (no parallax/elastic/morph/drag stretch); no autoplay you can't pause
- [ ] Loading shows content early; haptics/system sounds consistent; undo for destructive edits; confirmations for destructive actions

**Accessibility & content**
- [ ] Labels on icon-only controls; VoiceOver order; focus visible; Full Keyboard Access; Voice Control names match visible text
- [ ] Reduce Transparency → frostier; Increase Contrast → B/W + border (custom glass must implement)
- [ ] Copy: concise, "you", no "please"/exclamations, actionable errors; RTL mirroring via leading/trailing
- [ ] Privacy prompts in context with purpose; no fake pre-prompts

**Web implementation** (web targets only — `../Apple-Style/cheatsheets/web-implementation.md`)
- [ ] No SF Symbols and no self-hosted SF fonts shipped to the browser (licence); icons are own-drawn on a 24×24 / 1.8-stroke grid; type scale still reads on the Windows/Android fallback face
- [ ] Correct roles: tab bar is `<nav>` not `tablist`; segmented = tablist/radiogroup with roving `tabindex`; switch/slider use real semantics; dialogs trap focus, `inert` the background, close on Escape and restore focus
- [ ] `:focus-visible` ring on every interactive element, visible on glass; nothing relies on `outline: none`
- [ ] `100dvh` not `100vh`; `viewport-fit=cover` + `env(safe-area-inset-*)`; logical properties for RTL; overlays inside the documented z-index bands
- [ ] `touch-action` on draggable controls; hover effects gated by `@media (hover: hover)`; 44×44 enforced on `(pointer: coarse)`; `overscroll-behavior: contain` on sheets/menus/inner scrollers
- [ ] Forms: `<label for>`, `autocomplete`/`inputmode`, ≥16px inputs (no iOS zoom), errors via `aria-describedby` + `aria-invalid`, not colour alone
- [ ] Theme applied before first paint (no flash); `color-scheme` set; `theme-color` per scheme
- [ ] Media reserves space (`aspect-ratio`), lazy below the fold; cross-origin images given `data-glass-scheme-hint`
- [ ] Loading / empty / error / populated states all designed, chrome stable across them
- [ ] Perf: no blanket `will-change` on glass, ≤ ~20 lensed elements, dispersion only on a few non-fixed elements, no layout reads in `pointermove`, only `transform`/`opacity` animated
- [ ] Checked in Safari and Firefox, where lensing degrades to blur — the fallback still reads as a material

**Platform fit**
- [ ] iPhone one-handed reach & tab bar; iPad sidebar/menu bar/pointer; Mac menu bar + shortcuts + inspectors; watch glanceable; tvOS focus; visionOS depth + 60pt targets (`designing-for-*`)
- [ ] App icon layered (Icon Composer), no text/photos, all appearance variants

## Output template
```
| # | Sev | Element | Violation | HIG | Fix |
|---|-----|---------|-----------|-----|-----|
| 1 | Blocker | Card list | Liquid Glass in content layer | materials: "Don't use Liquid Glass in the content layer." | .as-glass → var(--as-bg-grouped-2) |
…
Summary: <what to change first and why it matters most>
```
