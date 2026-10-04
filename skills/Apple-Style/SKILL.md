---
name: Apple-Style
description: Use when building or restyling a UI that should look and behave like Apple's platforms — Liquid Glass, iOS 26 / macOS 26 design system, Human Interface Guidelines compliance, SF typography, system colors, floating tab bars/toolbars/sidebars, sheets, menus — for web (HTML/CSS/JS, React, Vue, Tailwind), SwiftUI, UIKit or AppKit. Also use when the user says "Apple style", "Liquid Glass", "HIG", "like iOS", "like macOS", "Cupertino", or asks whether a design follows Apple guidelines.
---

# Apple-Style

Entry point for four companion skills: this skill covers composition and Web implementation; **Apple-Style-HIG** provides source text; **Apple-Style-Liquid-Glass** covers material tuning; **Apple-Style-Review** records evidence and findings.

## Workflow

1. Read `cheatsheets/rules-and-evidence.md`. Identify target platform, application type, input methods and available container space separately. Preserve existing product conventions and the user's current design/implementation stage.
2. Classify content and navigation/control layers. Prefer standard components and semantic colors; use glass where the relevant platform guidance supports it. A web page does not automatically become a native window.
3. Load the relevant cheatsheets. For Web always read `web-implementation.md`; for material work read `materials-and-liquid-glass.md`. Load color, typography, layout, components, motion or accessibility only as needed.
4. When a number or recommendation matters, inspect the applicable platform section in `../Apple-Style-HIG/reference/` and its provenance in `sources.json`. Distinguish official requirements, official recommendations, project defaults and visual heuristics.
5. Implement within the authorized scope. The existing CSS/JS needs no runtime dependencies or build step. Use `web/demo.html` for component markup and `web/demo-desktop.html` only for a deliberately chosen Mac-like window.
6. Verify relevant states and record checked / not checked / not applicable with evidence using **Apple-Style-Review**. Do not infer test passes from a textual review.

## Composition defaults

- Keep a clear content/control hierarchy. Prefer regular glass on floating navigation and controls; content usually uses solid backgrounds or standard materials. Avoid unnecessary glass nesting. Platform-specific exceptions come from the source, not a universal prohibition.
- Use semantic label, background, separator and action colors. System color samples are not contrast guarantees: ordinary meaningful text needs 4.5:1 in default light and dark states. White-text buttons and selected rows use `--as-action-bg` / `--as-action-fg`; retest custom tints over the actual backdrop.
- Use concentric radii for nested shapes. Capsules suit many touch controls; dense Mac controls can use rounded rectangles. Exact spacing, pane widths and corner sizes in the Web CSS are project defaults.
- Select density from product/platform intent; adapt layout to the container. `data-platform="macos"` is an explicit density choice, never inferred from `>=1024px`. Sidebars, inspectors and menus are optional and follow the task's information structure.
- Keep meaningful click and keyboard activation even when adding drag. Respect disabled state, cancellation, focus and ARIA. Reduce Motion removes unnecessary elastic movement; avoid decorative bounce.
- Prefer monochrome navigation icons and restrained primary tint as a visual default. Keep useful borders, custom backgrounds or brand colors when needed for contrast, grouping or the existing design system.
- Native targets should use system components and semantic APIs first. Web assets do not ship SF fonts or SF Symbols.

## Web quick start

```html
<link rel="stylesheet" href="apple-style.css">
<main id="app">
  <button class="as-button as-button-filled">Save</button>
  <div class="as-segmented" role="radiogroup" aria-label="Map style">
    <button class="as-segment is-selected" role="radio" aria-checked="true">Map</button>
    <button class="as-segment" role="radio" aria-checked="false">Transit</button>
  </div>
  <button class="as-toggle" role="switch" aria-checked="true" aria-label="Wi-Fi">
    <span class="as-knob"></span>
  </button>
  <input class="as-slider" type="range" aria-label="Volume">
</main>
<script src="liquid-glass.js"></script>
<script>
  const runtime = LiquidGlass.init(document.querySelector('#app'));
  // Before removing this application surface: runtime.destroy();
</script>
```

Use `tablist` only when switching panels; every tab needs `aria-controls` pointing to its panel. `data-activation="manual"` separates arrow-key focus from Enter/Space activation. Value selectors use `radiogroup`. Both support click, roving tabindex and disabled-item skipping. Listen for `change`; do not add a second state-toggle click handler.

`init(root)` includes root itself, is idempotent and watches additions/removals within its scope. `destroy(root)` releases that scope; `detach(el)` releases a component. `attach(el, {scale, rim, chroma, lens, adapt})` stores options for resize/theme regeneration. See `web-implementation.md` for lifecycle details and React/Vue cleanup examples.

Optional structures: `.as-tabbar[data-sidebar]` opts into the project's width-based sidebar layout; `.as-window` / `.as-split` / `.as-inspector` compose a window where appropriate. A wide iPad retains iPad intent; a narrow Mac retains Mac intent; ordinary websites retain their page structure.

## Files

- `cheatsheets/`: topic references plus shared rule scope and evidence definitions.
- `web/apple-style.css`, `web/liquid-glass.js`: dependency-free Web assets.
- `web/demo.html`, `web/demo-desktop.html`: minimal examples, linked from `../../demo/index.html`.
- `scripts/hig-lookup.sh`: search local references.
- `scripts/update-reference.sh`: transactional manifest-backed refresh; failures leave the previous library intact.
- `../../docs/validation.md`: commands, actual evidence and unverified coverage.
