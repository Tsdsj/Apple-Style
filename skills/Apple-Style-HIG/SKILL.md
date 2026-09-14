---
name: Apple-Style-HIG
description: Use when you need Apple's actual Human Interface Guidelines text or numbers — any HIG page (foundations, patterns, components, inputs, technologies, platform guides), Liquid Glass developer documentation, or WWDC25 design session transcripts — to answer "what does Apple say about X", find exact specs (sizes, colors, radii, safe areas), or cite guidance for iOS, iPadOS, macOS, tvOS, visionOS, watchOS design decisions.
---

# Apple-Style-HIG — offline reference library

Verbatim-text markdown renderings of developer.apple.com/design (crawled 2026-09-14 from Apple's DocC JSON; images replaced with their alt text, which often describes the do/don't examples). ~300k words. Companion to **Apple-Style** (rules/tokens) and **Apple-Style-Liquid-Glass** (implementation).

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
- Treat the transcripts as design rationale; the HIG pages as normative.

## Refreshing
`../Apple-Style/scripts/update-reference.sh` re-crawls everything (curl + python3, no dependencies). Regenerate INDEX by hand if new pages appear.
