# Materials & Liquid Glass — rules that decide a design

Source: HIG *Materials*, HIG *Color → Liquid Glass color*, *Adopting Liquid Glass*, WWDC25 219 "Meet Liquid Glass", WWDC25 356. Full text: `Apple-Style-HIG/reference/hig/materials.md`, `reference/liquid-glass/`, `reference/wwdc25/219-*.md`.

## What it is
Liquid Glass is a **digital meta-material that bends and shapes light** (lensing) and moves like a lightweight liquid. It forms a **distinct functional layer for controls and navigation** (tab bars, toolbars, sidebars, sheets, menus, alerts) that **floats above the content layer**. Content scrolls and peeks through beneath it.

Layers of the material (all adapt to what is behind): lensing/refraction → blur + luminosity adaptation → optional tint → highlights (a virtual light source produces a rim that travels on interaction/device motion) → adaptive shadow (stronger over text, weaker over plain light backgrounds) → interactive glow that spreads from the touch point to nearby glass.

## The five hard rules
1. **Glass belongs only to the navigation/control layer. Never in the content layer.** Lists, cards, table views, app backgrounds use *standard materials* or solid colors. Exception: a *transient* control in content (slider knob, toggle knob) lifts into glass only while being manipulated.
2. **Never glass on glass.** Elements placed on a glass surface use fills, transparency, vibrancy — not another glass layer. Toolbar items *share one* glass background as a group.
3. **Use it sparingly.** System components pick it up automatically. Limit custom glass to the most important functional elements; overuse distracts from content.
4. **Regular and Clear are never mixed** in the same interface.
5. **Don't stack custom backgrounds under bars.** Remove custom bar backgrounds, borders and darkening overlays; they interfere with glass and the scroll edge effect.

## Regular vs Clear
| | Regular | Clear |
|---|---|---|
| Adaptivity | Blurs and adjusts luminosity of background; flips light/dark (small elements); works at any size over any content | **No adaptive behavior**, permanently more transparent |
| Use for | Almost everything: bars, sidebars, alerts, popovers, menus, anything with much text | Controls floating over **media-rich content** (photo/video), when a dimming layer won't hurt the content, and when the content on top is **bold and bright** |
| Legibility aid | Scroll edge effect | Add a **dark dimming layer, 35% opacity** when background is bright; not needed over dark content or when AVKit playback controls already dim |
| API | `Glass.regular`, `.glassEffect()` default | `Glass.clear`, `UIButton.Configuration.clearGlass()` |

## Size changes the material
- **Small (buttons, tab bar, toolbar):** flips light ⇄ dark with the background; symbols/text flip too (monochrome by default).
- **Large (sidebar, menu, sheet, popover):** thicker, more opaque, deeper richer shadow, more pronounced lensing, softer light scattering. **Does not flip** light/dark (too distracting). Nearby colorful content subtly spills light onto its surface and into its shadow.
- Sheets: half-height sheets are inset with glass; at full height they become **opaque** and anchor to the display edge.
- Window/pane loses focus → glass visually recedes.

## Color on glass ("stained glass")
- Glass has **no inherent color**; it takes color from behind. Tinting generates a *range of tones mapped to content brightness* — never an opaque solid fill.
- **Tint the background, not the label, for the single primary action** (`Done`, `View Bag`). Prominent button style = accent-tinted glass. Never tint several controls; if everything is tinted nothing stands out. Put brand color in the content layer instead.
- Symbols and text on bars: **monochrome** by default. Tint an icon only to convey meaning (call to action), not decoration.
- Colorful backgrounds → prefer monochrome bars, or pick an accent with strong differentiation. Check resting state (top of a scroll view) for legibility; avoid content overlapping glass in steady states — reposition or scale content.

## Scroll edge effect (replaces bar backgrounds and hard dividers)
- Auto-applied under system bars when pinned controls overlap a scroll view. Dissolves content into the background as it approaches the bar; when content darkens the glass, it switches to a subtle dim.
- **Soft** (default, iOS/iPadOS): gradual blur/fade. **Hard** (mostly macOS; pinned column headers, controls without backgrounds, interactive text): uniform, more opaque boundary.
- One effect per view; don't stack/mix styles; in split views keep heights consistent; not decorative — never where no floating UI exists.
- APIs: `scrollEdgeEffectStyle(_:for:)`, `safeAreaBar(...)`, `UIScrollEdgeElementContainerInteraction`.

## Motion & transitions
- Objects **materialize** in/out by modulating lensing (not a plain fade). Menus/popovers/action sheets/sheets **morph out of the control** that presented them and stay anchored to it (set the source view/item).
- Glass flexes on touch (gel-like), lights up from within under the fingertip, and glow spreads to adjacent glass.
- The highlight is not static: the virtual light **travels around the silhouette** during interaction (and with device motion), so the specular rim moves rather than sitting on one edge. On the web this is `--as-glass-light-angle` driven from the pointer, feeding a conic-gradient rim.
- **Light is bent, not painted.** The material is defined by refraction plus one precise hairline edge; the interior stays clean. A gradient sweeping the face, a double bevel, a thick bright outline or a brightness boost turn it into a glossy plastic button — and they look worst over plain backgrounds, where there is nothing to refract and the decoration is all that is left.
- Controls that can be dragged are dragged: see *Scrubbing* in `motion-and-interaction.md`.
- `GlassEffectContainer(spacing:)` lets neighboring shapes blend/morph; `glassEffectID` + `matchedGeometry`; `materialize` transition for distant elements; `glassEffectUnion` to merge several views into one glass shape.

## Accessibility (system applies automatically; custom glass must honor them)
- **Reduce Transparency** → frostier, obscures more. **Increase Contrast** → predominantly black/white + contrasting border. **Reduce Motion** → less intense effects, no elastic behavior. User "preferred look" setting (Clear/Tinted) changes opacity.
- Web equivalents: `prefers-reduced-transparency`, `prefers-contrast: more`, `prefers-reduced-motion` — all implemented in `web/apple-style.css`.

## Standard materials (content layer)
iOS/iPadOS: ultraThin, thin, regular (default), thick. Thicker = more contrast for text; thinner = more context retained. Use **vibrant** label/fill/separator colors on top (label > secondaryLabel > tertiaryLabel > quaternaryLabel; avoid quaternary on thin/ultraThin). Choose by semantic purpose, never by the color it happens to produce. macOS: `NSVisualEffectView.Material` with behind-window / within-window blending. visionOS windows: system *glass*, adaptive, prefer translucency to opaque colors. watchOS: keep default material backgrounds on modal sheets.

## Native API quick map
SwiftUI `glassEffect(_:in:)`, `Glass.regular/.clear/.tint()/.interactive()`, `GlassEffectContainer`, `glassEffectID`, `glassEffectUnion`, `GlassEffectTransition.matchedGeometry/.materialize`, button styles `.glass` `.glassProminent`, `backgroundExtensionEffect()`, `scrollEdgeEffectStyle`, `safeAreaBar`, `ConcentricRectangle`, `.rect(corners:isUniform:)`, `tabBarMinimizeBehavior(.onScrollDown)`, `tabViewBottomAccessory`, `Tab(role: .search)`. UIKit `UIGlassEffect`, `UIVisualEffectView`, `UIButton.Configuration.glass()/prominentGlass()/clearGlass()/prominentClearGlass()`, `UIBackgroundExtensionView`, `cornerConfiguration`, `UITabBarController.Mode.tabSidebar`, `UISearchTab`. AppKit `NSGlassEffectView`, `NSButton.BezelStyle.glass`, `NSBackgroundExtensionView`. Opt-out (temporary): Info.plist `UIDesignRequiresCompatibility`.
