---
name: Apple-Style-HIG
description: Use when you need Apple's actual Human Interface Guidelines text or numbers — any HIG page (foundations, patterns, components, inputs, technologies, platform guides), Liquid Glass developer documentation, WWDC25 design session transcripts, or App Store marketing guidelines (badge use, Apple product imagery, product-name and trademark wording for promoting an app) — to answer "what does Apple say about X", find exact specs (sizes, colors, radii, safe areas), or cite guidance for iOS, iPadOS, macOS, tvOS, visionOS, watchOS design decisions.
---

# Apple-Style-HIG — offline reference library

Markdown renderings (not byte-for-byte copies) of developer.apple.com/design (every page last fetched 2026-10-17, recorded per page in reference/sources.json; images replaced with their alt text, which often describes the do/don't examples), plus two App Store marketing pages in `marketing/` (fetched 2026-10-19). ~300k words. Companion to **Apple-Style** (rules/tokens) and **Apple-Style-Liquid-Glass** (implementation).

## How to use
1. Open `reference/INDEX.md` — every page with its one-line abstract, grouped as on Apple's site (Getting started · Foundations · Patterns · Components · Inputs · Technologies), plus Liquid Glass docs, WWDC25 transcripts, design-site pages, and App Store marketing guidelines.
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
  marketing/           guidelines.md: App Store marketing guidelines (App Store badges, Apple product images,
                       product names, trademark and credit lines) · pre-orders.md: Offering apps for pre-order
```

## Reading tips
- Each HIG page = Overview → Best practices (bold imperative sentences are the rules) → Platform considerations → Specifications (tables) → Resources → Change log. `--rules` extracts the bold sentences.
- Pages with hard numbers: `typography` (all Dynamic Type tables), `color` (RGB for every system color/gray in 4 appearances), `layout` (tvOS safe areas/grids), `app-icons` (sizes), `buttons` (44pt), `sf-symbols`, `widgets`, `complications`, `live-activities`, `materials`.
- Platform pages `designing-for-<platform>` set the mindset; `<component>` pages have a "Platform considerations" section for each OS.
- Newest guidance: October 2026 `widgets`, `live-activities`; September 2026 `designing-for-iphone-duo` (new), `layout`, `branding`, `shareplay`, `apple-in-app-purchase` (renamed from In-App Purchase); June 2026 `design-principles`, `siri`, `snippets`, `app-shortcuts`, `menus`, `sidebars`, `scroll-views`, `search-fields`, `tab-bars`. `design-site/whats-new.md` lists dates.
- HIG combines recommendations and platform constraints; do not turn “consider” or “prefer” into universal requirements. Transcripts provide rationale. Use `../Apple-Style/cheatsheets/rules-and-evidence.md` to label rule strength and applicability.
- Width does not determine platform: read the relevant platform section for the actual target.
- `reference/sources.json` records canonical URL, fetch URL, fetched_at and content SHA-256 (plus the source response hash). A timestamp says when the page was fetched, not that derived cheatsheet rules were re-validated.
- `marketing/` is Apple's promotion guidance, not HIG. It holds text only: no badge artwork, product images or download files are stored. The "Download Artwork" entries and in-page links in `guidelines.md` render as the bare `developer.apple.com` home URL (a renderer limit), so cite the page text, not those links.

## Refreshing
`../Apple-Style/scripts/update-reference.sh` refreshes all manifest entries (HIG, Liquid Glass APIs, design-site, WWDC, marketing) with Python 3 standard library and generates INDEX automatically. A new page is a `sources.json` entry (`kind` `html` for an Apple HTML page) under one of the `CATEGORIES` in `update_reference.py`; a new category also needs that constant and a test. HIG links discover new pages on a full run. `--only hig/layout.md` or `--limit 5` bounds online checks; `--index-only` is offline. A failed batch does not overwrite valid reference pages. When Apple moves a page the report gives `moved_to`: update that entry's `url`/`fetch_url`, or `--retire` the old path when a discovered page replaces it. WWDC transcripts go in a `wwdcNN/` directory per event. The report's `recheck_reasons` maps each cheatsheet to the changed pages it cites; recheck those passages — a refreshed source does not automatically validate derived rules.
