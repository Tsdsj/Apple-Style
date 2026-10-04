---
name: Apple-Style-HIG
description: Use when you need Apple's actual Human Interface Guidelines text or numbers — any HIG page (foundations, patterns, components, inputs, technologies, platform guides), Liquid Glass developer documentation, or WWDC25 design session transcripts — to answer "what does Apple say about X", find exact specs (sizes, colors, radii, safe areas), or cite guidance for iOS, iPadOS, macOS, tvOS, visionOS, watchOS design decisions.
---

# Apple-Style-HIG — offline reference library

Markdown renderings (not byte-for-byte copies) of developer.apple.com/design (legacy snapshot reported as 2026-09-14; exact original timestamps unknown; later fetches recorded in reference/sources.json; images replaced with their alt text, which often describes the do/don't examples). ~300k words. Companion to **Apple-Style** (rules/tokens) and **Apple-Style-Liquid-Glass** (implementation).

## How to use
1. Open `reference/INDEX.md` — every page with its one-line abstract, grouped as on Apple's site (Getting started · Foundations · Patterns · Components · Inputs · Technologies), plus Liquid Glass docs, WWDC25 transcripts, and design-site pages.
2. Read the specific page: `reference/hig/<slug>.md` (slug = last URL segment on developer.apple.com, e.g. `materials`, `buttons`, `tab-bars`, `designing-for-visionos`).
3. Or search: `../Apple-Style/scripts/hig-lookup.sh "safe area"`, `hig-lookup.sh --rules toolbars` (bold rule sentences only), `hig-lookup.sh --page sheets`, `--list`.
4. Quote or paraphrase with the page name; link to `https://developer.apple.com/design/human-interface-guidelines/<slug>` when the user needs the canonical source.

## Structure
```
reference/
  INDEX.md
  hig/                 172 HIG pages (all sections, all platforms, incl. components sub-groups)
  liquid-glass/        Adopting Liquid Glass · overview · Applying Liquid Glass to custom views (SwiftUI)
                       · Landmarks sample · App design and UI
    api/               glassEffect, Glass.interactive, GlassEffectContainer transitions, glassEffectUnion,
                       GlassProminentButtonStyle, UIGlassEffect, NSGlassEffectView, ConcentricRectangle,
                       rect(corners:), UICornerConfiguration, backgroundExtensionEffect, scrollEdgeEffectStyle,
                       safeAreaBar, UIDesignRequiresCompatibility, Icon Composer guide, Landmarks sub-articles
  wwdc25/              219 Meet Liquid Glass · 356 Get to know the new design system · 220 New look of app icons
                       · 361 Icon Composer · 359 Design foundations · 208 Elevate iPad app
                       · 323 SwiftUI new design · 284 UIKit new design · 310 AppKit new design
  design-site/         What's new (dated changelog) · Design Resources · Get started pathway
```

## Reading tips
- Each HIG page = Overview → Best practices (bold imperative sentences are the rules) → Platform considerations → Specifications (tables) → Resources → Change log. `--rules` extracts the bold sentences.
- Pages with hard numbers: `typography` (all Dynamic Type tables), `color` (RGB for every system color/gray in 4 appearances), `layout` (tvOS safe areas/grids), `app-icons` (sizes), `buttons` (44pt), `sf-symbols`, `widgets`, `complications`, `live-activities`, `materials`.
- Platform pages `designing-for-<platform>` set the mindset; `<component>` pages have a "Platform considerations" section for each OS.
- Newest guidance (June 2026): `design-principles`, `siri`, `snippets`, `app-shortcuts`, `branding`, `layout`, `menus`, `shareplay`. `design-site/whats-new.md` lists dates.
- HIG combines recommendations and platform constraints; do not turn “consider” or “prefer” into universal requirements. Transcripts provide rationale. Use `../Apple-Style/cheatsheets/rules-and-evidence.md` to label rule strength and applicability.
- Width does not determine platform: read the relevant platform section for the actual target.
- `reference/sources.json` records canonical URL, fetch URL, fetched_at and content SHA-256. Null timestamps identify legacy content; they are not fresh validation.

## Refreshing
`../Apple-Style/scripts/update-reference.sh` refreshes all manifest entries (HIG, Liquid Glass APIs, design-site, WWDC) with Python 3 standard library and generates INDEX automatically. HIG links discover new pages on a full run. `--only hig/layout.md` or `--limit 5` bounds online checks; `--index-only` is offline. A failed batch does not overwrite valid reference pages. Read the report and recheck the listed cheatsheets; a refreshed source does not automatically validate derived rules.
