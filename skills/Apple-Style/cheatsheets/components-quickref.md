# Components quick reference (new design, iOS/iPadOS/macOS 26)

Each line is the decisive rule. Full pages: `Apple-Style-HIG/reference/hig/<slug>.md` (buttons, toolbars, tab-bars, sidebars, sheets, menus, alerts, popovers, action-sheets, search-fields, segmented-controls, sliders, toggles, steppers, pickers, text-fields, lists-and-tables, split-views, windows, the-menu-bar, context-menus, labels, progress-indicators, …).

## Buttons (`hig/buttons.md`)
- Hit region ≥ 44×44 (visionOS 60). **Always a press state.** Verb labels in title case ("Add Item"), no trailing period; icon-only buttons need accessibility labels.
- **Style, not size, distinguishes the preferred option.** One or two prominent buttons per view.
- Styles: plain / gray / tinted / filled (prominent) / bordered (macOS) / **glass** / **glassProminent**; sizes mini, small, regular(medium), large, **extra-large**. Capsule default on iOS; macOS small controls rounded-rect.
- Don't build glass buttons by hand — use `.buttonStyle(.glass)` / `UIButton.Configuration.glass()` / `NSButton.BezelStyle.glass`.
- Destructive actions: red text/fill, confirm via action sheet/alert.

## Toolbars (`hig/toolbars.md`)
- Items float on a glass surface; **related items share one background** (group by function and frequency); a fixed spacer (`ToolbarSpacer(.fixed)`) splits groups; flexible spacer pushes groups apart.
- **Don't mix symbols and text in one shared background** (reads as one button). Text buttons sit in their own container. Primary action ("Done") is separate and **tinted** (blue checkmark iOS / prominent text macOS).
- Prefer symbols over text; every icon has an accessibility label; monochrome rendering by default. Crowded → move secondary actions into a More (…) menu.
- Remove custom bar backgrounds/borders/darkening. Hide the whole toolbar item, not its inner view. Badges via `.badge`.
- Search in toolbar: bottom on iPhone, top-trailing on iPad/Mac.

## Tab bars (`hig/tab-bars.md`)
- Floating capsule at the bottom (iPhone); 3–5 tabs; **Search is a dedicated tab at the trailing end** (`Tab(role: .search)`), visually separated.
- Can **minimize on scroll** (`tabBarMinimizeBehavior(.onScrollDown)`), re-expands on reverse scroll. Bottom accessory (e.g., Now Playing) via `tabViewBottomAccessory` — persistent features only, never screen-specific actions (a checkout button belongs with content).
- Adapts into a **sidebar** at regular width (`sidebarAdaptable`, `tabSidebar`). Tab bar + sidebar are one navigational element that scales.
- Tabs navigate; don't use them for actions. Same symbols on every platform.

## Sidebars & split views (`hig/sidebars.md`, `hig/split-views.md`)
- Inset, floating glass; content extends beneath; use background extension effect for hero images; inspector on the trailing side (`inspector(isPresented:)`, `UISplitViewController.Column.inspector`).
- Large glass: does not flip light/dark; picks up ambient color from nearby content.

## Navigation bars (`hig/navigation-bars.md` in `hig/toolbars.md` family)
- Large title when at top; standard title on scroll; back button with previous title or chevron only; controls in glass groups.

## Sheets (`hig/sheets.md`) · Popovers · Action sheets · Alerts
- Sheet: inset half-sheet with glass, detents (medium/large), grabber, opaque at full height; morphs from its presenting button (zoom transition). Don't add `presentationBackground`.
- Action sheet: springs from the source control; shows ≤ ~6 actions; destructive red at bottom of actions; Cancel separate.
- Alert: title (bold, **left-aligned**) + short message + ≤ 2–3 buttons; default action on the trailing side; avoid alerts for routine info; never for marketing.
- Popover (iPad/Mac): anchored to source with arrow; on iPhone present as sheet instead.
- Menus/popovers/alerts/dialogs **morph out of** the control that opened them.

## Menus (`hig/menus.md`, `hig/context-menus.md`, `hig/the-menu-bar.md`)
- Adopt glass; **standard actions show icons** (Cut/Copy/Paste via standard selectors); introduce a related group with one symbol and let text do the rest — don't repeat/tweak icons.
- Top context-menu actions should match swipe actions. iPadOS now has a menu bar; keep command placement consistent with macOS.
- Keyboard shortcuts on macOS/iPadOS; ellipsis for items that need more input; checkmarks for state; separators to group; ≤ ~7 items per group.

## Controls
- **Segmented control**: 2–5 segments, equal width, text OR icons (not mixed), selection lifts into glass; not for navigation actions.
- **Toggle**: capsule, green when on; label describes the *on* state; no "Enable/Disable" text toggles.
- **Slider**: knob becomes a transparent lens on drag; show value/min-max icons where useful; continuous vs discrete.
- **Stepper**: small integer ranges; show the value nearby.
- **Text fields**: rounded; placeholder is a hint, not a label; clear button; appropriate keyboard type; secure entry for passwords; capsule search field on its own glass surface; search field slides up with keyboard on iPhone.
- **Pickers**: wheel (iPhone) vs menu/pop-up (Mac/iPad); date pickers compact/inline.
- **Progress indicators**: determinate bar when duration known; indeterminate spinner otherwise; never freeze the UI.
- **Labels/status**: use semantic colors and SF Symbols; badges red with count.

## Lists & tables (`hig/lists-and-tables.md`)
- Inset grouped style with larger radius and taller rows; **title-style section headers**; disclosure chevrons for navigation; swipe actions mirror context menu; selection with checkmarks in edit mode; use `Form(.grouped)` for settings.

## Icons & symbols (`hig/icons.md`, `hig/sf-symbols.md`)
- Prefer **SF Symbols** (7,000+), weights match text weight, scales small/medium/large; rendering modes monochrome / hierarchical / palette / multicolor; symbol animations (bounce, replace, wiggle, breathe, rotate, draw). Use the *preferred glyph* list for common actions (share, add, edit, delete, favorite…). When there's no clear shorthand, use a **text label** (Select, Edit).
- Never mimic Apple products in custom symbols; provide alt text for custom symbols.

## App icons (`hig/app-icons.md`)
- Layered design composed in **Icon Composer** (foreground/middle/background), solid filled overlapping semi-transparent shapes, system applies mask/blur/highlights; 1024×1024 square (iOS/iPadOS/macOS), rounded-rect mask; appearances default/dark/clear light/clear dark/tinted light/tinted dark; watchOS 1088 circular; tvOS 800×480 parallax; visionOS 1024 circular 3D. Keep elements centered; no text unless brand; no photos/screenshots.
