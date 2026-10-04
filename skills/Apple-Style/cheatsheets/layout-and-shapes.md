# Layout, shapes & concentricity

Scope: [rule strength and evidence](rules-and-evidence.md). Platform recommendations, project defaults and visual heuristics are distinct; apply the cited platform section.

Source: HIG *Layout*, *Buttons*, *Windows*, *Sheets*; WWDC25 356 "Get to know the new design system"; SwiftUI `ConcentricRectangle`. Full text in `Apple-Style-HIG/reference/`.

## Metrics
- **Hit region ≥ 44×44 pt with a finger** (visionOS 60×60); **≥ 24×24 px with a pointer** (WCAG 2.2 Target Size (Minimum)) — a mouse is more precise than a fingertip, and a Mac inspector at 44pt a row holds a third of what it should. Gate on the **input, not the screen**: `@media (any-pointer: coarse)`. Spacing between adjacent targets ≥ 8pt either way.
- Layout margins: 16pt compact width, 20pt regular width (system layout guides). Readable content width ≈ 672pt — that is a guide for **running text**, not a page cap: applied to a whole layout it leaves dead gutters on a wide display. Tables and lists fill their column; prose and forms are limited inside it.
- 4pt / 8pt spacing grid. Standard control height iOS: 44 (buttons in bars 44; list rows ≥ 44, iOS 26 rows/padding larger). macOS control sizes: mini / small / medium / **large** / **extra-large** (new; capsule, uses Liquid Glass for emphasis in spacious areas). Mini/small/medium stay rounded rectangles for dense inspectors.
- tvOS safe area: inset 60pt top/bottom, 80pt sides; grid columns 2–9 with 40pt horizontal / 100pt vertical spacing (table in `hig/layout.md`).
- Respect **safe areas** (Dynamic Island, home indicator, camera housing on Mac, window controls). Extend full-screen backgrounds under bars/sidebars/tab bars; controls stay inside safe areas.
- Platform and app type set conventions; size classes and available container space drive reflow. Keep functionality across sizes. Switch tab bar/sidebar only if appropriate to the navigation model.
- Support **arbitrary window sizes** (iPadOS continuous resizing, macOS); use split views for fluid column reflow; support Dynamic Type reflow.

## Optional Mac-like panes (example breakpoint ≥1024px) — starting points, not Apple numbers
`hig/split-views.md` only says "Set **reasonable** defaults for minimum and maximum pane sizes" without saying what reasonable is. These are measured widths at which a two-level sidebar row and a key/value inspector row stop wrapping — **measure your own content and move them.**

| | ≥1280px | 1024–1280px | why |
|---|---|---|---|
| Sidebar | 264 | 220 | two levels + icon + trailing count, unwrapped |
| Inspector | 380 | 300 | a label/value pair with a currency amount on one line |
| Content | rest, floor ~480 | rest, floor ~380 | below it a list row with an amount wraps its title |

The derivation is the reusable part: **264 + 380 in a 1024px window squeezes the detail column to 378px, where the amount wraps to a second line; 220 + 300 leaves 502px and it comes back onto one line.** Hence two tiers, not one set of widths.
- **Nothing critical on the bottom edge of a window** — "People often move windows so that the bottom edge is below the bottom of the screen" (`hig/layout.md` macOS, repeated in `hig/windows.md`). For a Mac window, consider leading navigation and a trailing inspector if the task needs them. This does not apply automatically to ordinary websites.
- **Prefer ≤ two sidebar levels** in the HIG pattern; deeper hierarchies get a **content list** column between sidebar and detail (`hig/sidebars.md`). Nothing critical at the sidebar's bottom edge either.
- Divider: **thin (1px) style preferred**; widen the grab area, not the line. Set minimum/maximum pane sizes so the divider never becomes hard to hit.
- **When content is shorter than the window**, panes still run the full height — the sidebar and inspector are the two edges of the window, not boards floating on a page.
- Web: `.as-window` / `.as-menubar` / `.as-toolbar-window` / `.as-split` / `.as-split-divider` / `.as-inspector` in `web/apple-style.css`; `web/demo-desktop.html`.

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
