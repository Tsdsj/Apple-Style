# Layout, shapes & concentricity

Source: HIG *Layout*, *Buttons*, *Windows*, *Sheets*; WWDC25 356 "Get to know the new design system"; SwiftUI `ConcentricRectangle`. Full text in `Apple-Style-HIG/reference/`.

## Metrics
- **Hit region ≥ 44×44 pt** (visionOS 60×60). Spacing between tappable controls ≥ 8pt.
- Layout margins: 16pt compact width, 20pt regular width (system layout guides). Readable content width ≈ 672pt.
- 4pt / 8pt spacing grid. Standard control height iOS: 44 (buttons in bars 44; list rows ≥ 44, iOS 26 rows/padding larger). macOS control sizes: mini / small / medium / **large** / **extra-large** (new; capsule, uses Liquid Glass for emphasis in spacious areas). Mini/small/medium stay rounded rectangles for dense inspectors.
- tvOS safe area: inset 60pt top/bottom, 80pt sides; grid columns 2–9 with 40pt horizontal / 100pt vertical spacing (table in `hig/layout.md`).
- Respect **safe areas** (Dynamic Island, home indicator, camera housing on Mac, window controls). Extend full-screen backgrounds under bars/sidebars/tab bars; controls stay inside safe areas.
- Size classes (compact/regular × horizontal/vertical) drive layout — **never device type or orientation.** Keep functionality identical across size classes; switch tab bar ↔ sidebar as width grows.
- Support **arbitrary window sizes** (iPadOS continuous resizing, macOS); use split views for fluid column reflow; support Dynamic Type reflow.

## Visual hierarchy
- Order by importance top→bottom, leading→trailing; align to make scanning easy; indent to show subordination; group with negative space, container shapes, or separators; progressive disclosure for density.
- **Differentiate controls from content with Liquid Glass + scroll edge effect** — not solid/semi-opaque bar backgrounds.
- Background extension effect: mirror + blur a hero image beneath sidebars/inspectors instead of clipping it (`backgroundExtensionEffect()`, `UIBackgroundExtensionView`, `NSBackgroundExtensionView`). Keep text/controls above it, not inside the mirrored zone.
- Scroll views extend beneath sidebars by default; carousels glide under.

## Shapes — three types (WWDC25 356)
| Type | Radius | Use |
|---|---|---|
| **Fixed** | constant | Standalone components where nesting isn't a concern |
| **Capsule** | height / 2 | Buttons, bars, sliders, switches, grouped table corners; touch layouts. On macOS only Large/XL controls and standout actions |
| **Concentric** | parent radius − padding | Anything nested inside a rounded container (artwork in a card, sheet inside display, controls near window corners) |

- **Concentricity**: align radii and margins around a shared center so nested shapes fit. Symptoms of getting it wrong: corners that look **pinched** (inner radius too large) or **flared** (too small). Fix = make the inner shape concentric; use a **fallback/minimum radius** for components that also stand alone (`.concentric(minimum: 12)`).
- Phone: capsule buttons with extra margin near screen edges. iPad/Mac: concentric shape aligned to the window edge.
- Views are mathematically centered when it makes sense and optically offset when it doesn't.
- Hardware informs UI curvature: windows (macOS 26 ≈ 24pt-class corners), sheets (larger radius nesting into the display), section corners increased to match controls.
- Web: `.as-container{--as-container-radius:R}` + child `.as-concentric{--as-concentric-inset:P}`, or `LiquidGlass.concentric(container)`.

## Windows, sheets, modality (new design)
- Half sheets are **inset from the display edge** with glass; full height → opaque, anchored. Check content near rounder corners and what peeks around the inset.
- Action sheets **originate from the element that triggered them** (set source view/item); other UI stays interactive.
- Pair glass with a **dimming layer** when a task interrupts the main flow (modality); parallel tasks get glass separation without dimming. Dragging a sheet up → glass becomes more opaque and grows slightly.
- Remove custom sheet/popover background views.
- Lists/tables/forms: larger row height & padding, bigger section radius, title-style section headers, use grouped form style.
