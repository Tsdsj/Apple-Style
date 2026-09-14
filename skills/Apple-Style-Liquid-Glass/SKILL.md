---
name: Apple-Style-Liquid-Glass
description: Use when implementing, tuning or debugging the Liquid Glass material itself — frosted/refractive glass buttons, bars, sheets, menus that adapt to the content behind them — on the web (CSS backdrop-filter, SVG displacement lensing, React/Vue/Tailwind) or natively (SwiftUI glassEffect, UIGlassEffect, NSGlassEffectView). Also when glass looks flat, muddy, illegible, or "glass on glass", or when Reduce Transparency / Increase Contrast / Reduce Motion behavior is needed.
---

# Apple-Style-Liquid-Glass

Companion of **Apple-Style** (rules, tokens) and **Apple-Style-HIG** (source text). Read `../Apple-Style/cheatsheets/materials-and-liquid-glass.md` first; this skill is about *making* the material.

## Anatomy to reproduce (WWDC25 219)
| Layer | What Apple does | Web (`../Apple-Style/web/`) |
|---|---|---|
| Lensing | Bends/concentrates light at the rim; defines the shape without opacity | `liquid-glass.js` builds a per-element SVG `feDisplacementMap` from a rounded-rect distance field, displacing along the **surface normal** (so long capsules bend at their flat edges instead of smearing toward the center), and sets `backdrop-filter: url(#id)` (Chromium). Others fall back to blur. |
| Dispersion | Thick glass splits wavelengths — a faint colour fringe at the rim | three displacement passes at ×1.14 / ×1.0 / ×0.86, recombined one channel each via `feColorMatrix` + `feComposite arithmetic`. Budgeted (`chromaBudget`, 24) and only for small elements; `data-chroma="on|off"` overrides. |
| Blur + luminosity | Regular: blurs and re-levels brightness for legibility; more opaque when large | `.as-glass` `backdrop-filter: blur(14px) saturate(1.6) brightness(1.06) contrast(1.04)` + `--_fill` (≈42% white/dark); `.as-glass-large` blur 40px, fill ≈70%. The brightness/contrast re-level is what keeps refracted content punchy instead of milky. |
| Thickness | The slab has a body, suggested at the edge — never painted across the face | `--as-glass-bevel`: one hairline where light enters the top edge + a faint inner refraction ring. `--as-glass-sheen` is **transparent by default**; a gradient sweeping the body is gloss, not glass. |
| Tint | Stained glass mapped to background brightness; never solid | `.as-glass-prominent/.as-glass-tinted` → `color-mix(tint 78%, transparent)` layered above the fill; set `--as-tint`. |
| Highlights | Virtual light source; rim bright on the lit side, faint opposite; **travels around the silhouette** on interaction | `::before` masked **conic** gradient, 1px, rotated by `--as-glass-light-angle` (145° at rest). One dominant arc plus a whisper on the far edge — two matched poles read as a drawn outline. JS points it at the pointer; the property is `@property`-registered so it glides back. |
| Shadow | Deeper over text, lighter over plain light bg; richer when large | `--as-glass-shadow` / `-large`; JS sets `data-glass-over="text"`. |
| Interactive glow | Lights from within under the finger, spreads to neighbors, gel flex | `::after` two-stop radial (hot core + spread) at `--as-px/--as-py`; `.is-pressed` sets `--as-flex-x/y` (1.06 / 1.03) consumed by `.as-glass { transform: scale(…) }`; JS `spreadToNeighbors`. |
| Scrubbing | Segmented control, switch and slider track a drag 1:1 and stretch with it | `LiquidGlass.controls()` — `.as-seg-indicator` (translate + `--as-ind-sx` stretch, rubber-band at the ends), `.as-toggle` knob throw, `.as-slider-knob` lens overlay. Emits `change`. |
| Adaptivity | Small glass flips light/dark with content; large glass doesn't; inactive window recedes | JS `adapt()` samples `elementsFromPoint` → `data-glass-scheme`; `data-glass-scheme-hint` on content regions; `data-glass-focus="inactive"`. |
| Scroll edge effect | Content dissolves under bars; soft vs hard | `.as-scroll-edge.as-edge-top/-bottom[.as-edge-hard]` |
| Accessibility | Reduce Transparency → frostier; Increase Contrast → B/W + border; Reduce Motion → no elastic | `@media` blocks at the end of the CSS; `data-liquid-glass="tinted"` for the user's preferred look. |

## Web recipe
1. Include `apple-style.css` and `liquid-glass.js`; call `LiquidGlass.init()` after DOM ready (or `<script src=… data-auto>`).
2. Mark surfaces: `as-glass` (+ `as-glass-interactive` for controls, `as-glass-large` for sidebar/menu/sheet/alert/popover, `as-glass-clear as-glass-dimmed` only over media). Groups: `as-glass as-glass-group` with `.as-item` children.
3. Give the content layer something real behind the glass (images, color) and make sure the glass **overlaps** it — glass over a flat page background looks like a gray pill; that is expected.
4. Custom shape: set `--as-glass-radius`. Tint: `--as-tint`. Light direction: `--as-glass-light-angle`.
5. Morphing: `LiquidGlass.morph(buttonEl, menuEl)` (matchedGeometry-style ghost), `LiquidGlass.materialize(el, show)`; a `.as-menu.is-open` already scales from its `--as-origin`. Note both animate `transform` to `none`, so centre a morph/materialize target with a wrapper (grid `place-items:center`), never with `translate(-50%,-50%)`.
6. Controls: write plain `.as-segmented` / `.as-toggle` / `.as-slider` markup; `init()` (or `LiquidGlass.controls(root)`) adds the indicator, the lens knob and the drag gesture, then emits a bubbling `change`. Read state from the DOM (`aria-checked`, `.is-selected`, `input.value`). Adding your own click handler double-toggles.
7. Frameworks: React/Vue — render the same classes; call `LiquidGlass.attach(ref.current)` in an effect for elements created later (a `MutationObserver` also auto-attaches). Tailwind — keep the stylesheet; don't rebuild blur with `backdrop-blur-*` utilities (you lose lensing/adaptivity/a11y).
8. Performance: ≤ ~20 lensed elements per view; dispersion adds two passes and is capped at 24 elements (`data-chroma="off"` to reclaim some); the displacement map is regenerated on resize only; avoid animating `backdrop-filter`; large sheets use blur only.

Tuning table (edit tokens, not selectors):
| Symptom | Token |
|---|---|
| Too milky / not enough content visible | lower alpha in `--as-glass-fill` (0.30–0.45) or reduce blur |
| Illegible text on busy photo | use regular not clear; raise fill alpha; add `.as-glass-dimmed` for clear |
| Rim invisible on dark bg | raise `--as-glass-rim-hi` for `[data-glass-scheme="dark"]` |
| Lensing too strong/wobbly | `LiquidGlass.attach(el,{scale:12, rim:14})` |
| Reads as a flat gray pill, not glass | first check the element actually **overlaps content** — glass over a flat page background has nothing to refract and will always look like a pill. Then raise `--as-glass-contrast`, then `data-chroma="on"` |
| **Looks glossy / cheap / like a 2008 web button** | you are painting light onto the surface instead of bending it. Set `--as-glass-sheen: transparent`, keep `--as-glass-brightness: 1`, drop `--as-glass-rim-width` to 1px, lower `--as-glass-rim-hi`, and remove any second white bevel line. Clarity must come from refraction and one precise edge |
| Colour fringing too strong | `data-chroma="off"`, or lower the ×1.14/×0.86 spread in `filterMarkup` |
| Rim looks painted on one side and never moves | the light must follow the pointer — make sure `LiquidGlass.init()` ran and `--as-glass-light-angle` is not hard-coded |
| Controls feel stiff / only respond to clicks | you added your own click handler; remove it and listen for `change` |
| Group looks like separate buttons | children must be `.as-item`, never `.as-glass` |

## Native recipe
- SwiftUI: `Text("Hi").padding().glassEffect()` → capsule regular; `.glassEffect(.regular.tint(.orange).interactive(), in: .rect(cornerRadius: 16))`; group with `GlassEffectContainer(spacing: 40) { … }`; ids via `@Namespace` + `.glassEffectID("x", in: ns)`; union with `.glassEffectUnion(id:namespace:)`; transitions `.glassEffectTransition(.matchedGeometry | .materialize)`; buttons `.buttonStyle(.glass)` / `.glassProminent`; bars: `ToolbarSpacer(.fixed)`, `.sharedBackgroundVisibility(.hidden)`, `.badge()`, `Tab(role: .search)`, `.tabBarMinimizeBehavior(.onScrollDown)`, `.tabViewBottomAccessory {}`, `.backgroundExtensionEffect()`, `.scrollEdgeEffectStyle(.soft|.hard, for: .top)`, `.safeAreaBar(edge:)`, `ConcentricRectangle()` / `.rect(corners: .concentric(minimum: 12))`. Apply `glassEffect` **after** appearance modifiers, to the control itself not inner views.
- UIKit: `UIVisualEffectView(effect: UIGlassEffect())` (`.isInteractive`, `.tintColor`), `UIButton.Configuration.glass()/prominentGlass()/clearGlass()`, `UIBackgroundExtensionView`, `view.cornerConfiguration = .corners(radius: .containerConcentric(minimum: 12))`, `UITabBarController.Mode.tabSidebar`, `UISearchTab`, `UIScrollEdgeElementContainerInteraction`, `tabBarMinimizeBehavior = .onScrollDown`.
- AppKit: `NSGlassEffectView` (`contentView`, `cornerRadius`, `tintColor`), `NSGlassEffectContainerView`, `NSButton.BezelStyle.glass`, `NSBackgroundExtensionView`, `NSSplitViewItem(inspectorWithViewController:)`.
- Compatibility escape hatch (one release): Info.plist `UIDesignRequiresCompatibility = YES`.
- Full text: `../Apple-Style-HIG/reference/liquid-glass/` and `reference/wwdc25/323-*.md`, `284-*.md`, `310-*.md`.

## Don't
- Don't put glass on scrolling content, cards, table cells, or full-page backgrounds. Don't nest glass. Don't tint more than the primary action. Don't mix regular and clear. Don't add opaque backgrounds behind bars. Don't fade glass in/out with opacity alone. Don't disable the accessibility media queries.
- Don't ship click-only segmented controls, switches or sliders — on Apple platforms all three are drag targets. Don't leave a knob glassy at rest; the lift is transient.
- **Don't paint the highlight.** No gradient sweeping the body, no double white bevel, no thick bright outline, no brightness boost. Every one of those reads as cheap plastic, and they read worst exactly where glass has nothing behind it to refract — which is where people look first.
