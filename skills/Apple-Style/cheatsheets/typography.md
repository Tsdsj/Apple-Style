# Typography — SF, text styles, Dynamic Type

Scope: [rule strength and evidence](rules-and-evidence.md). Platform recommendations, project defaults and visual heuristics are distinct; apply the cited platform section.

Source: HIG *Typography* (`Apple-Style-HIG/reference/hig/typography.md`).

## Fonts
- **San Francisco (SF Pro)** is the system font: SF Pro Text (< 20pt) and SF Pro Display (≥ 20pt) are chosen automatically; SF Pro Rounded, SF Compact (watchOS), SF Mono, **New York** (serif companion). Download at developer.apple.com/fonts (license: Apple platform software only).
- Web: `-apple-system, BlinkMacSystemFont, system-ui` renders SF on Apple devices; provide Helvetica/Arial fallbacks. Do not self-host SF Pro on the web (license).
- Weights: Ultralight → Black (9). Body text: Regular; emphasis: Semibold; large titles: Bold. Avoid Light/Thin for small text.
- **Variable optical sizes + tracking** are applied by the system; on web use approximate tracking (17pt ≈ −0.43px, 13pt ≈ −0.08px, 34pt ≈ +0.4px).

## iOS / iPadOS text styles — Large (default) size
| Style | Weight | Size | Leading | Emphasized |
|---|---|---|---|---|
| Large Title | Regular | 34 | 41 | Bold |
| Title 1 | Regular | 28 | 34 | Bold |
| Title 2 | Regular | 22 | 28 | Bold |
| Title 3 | Regular | 20 | 25 | Semibold |
| Headline | Semibold | 17 | 22 | Semibold |
| Body | Regular | 17 | 22 | Semibold |
| Callout | Regular | 16 | 21 | Semibold |
| Subhead | Regular | 15 | 20 | Semibold |
| Footnote | Regular | 13 | 18 | Semibold |
| Caption 1 | Regular | 12 | 16 | Semibold |
| Caption 2 | Regular | 11 | 13 | Semibold |

Dynamic Type sizes xSmall … xxxLarge scale Body 14 → 23pt; accessibility sizes AX1–AX5 scale Body 28 → 53pt (full tables in the reference page). **Minimum size for readable text: 11pt** (Caption 2 at default).

## macOS built-in text styles
Large Title 26/32 · Title 1 22/26 · Title 2 17/22 · Title 3 15/20 · Headline 13/16 Bold · **Body 13/16** · Callout 12/15 · Subheadline 11/14 · Footnote 10/13 · Caption 1 10/13 · Caption 2 10/13 Medium.

tvOS: Title 1 76/96 Medium … Body 29/36 Medium. watchOS Large (40–42mm): Large Title 36, Title 1 34, Body 16. visionOS: same styles as iOS but rendered on glass; prefer Bold/Semibold weights.

## Rules
- **Use the built-in text styles**; they support Dynamic Type, tracking, and leading automatically. Custom fonts must still scale with Dynamic Type and remain legible at all sizes.
- **Hierarchy through weight/size/color, not decoration.** Body 17 regular; secondary text uses `secondaryLabel`, not a smaller size only.
- **Support Dynamic Type**: layout must reflow (horizontal stacks → vertical, rows grow, no clipped text). Test smallest and largest (AX5). Don't truncate essential text; wrap instead.
- **Minimize typeface count.** One family (SF) plus at most one brand/display face.
- **New design (iOS 26 / macOS 26)**: typography is **bolder and left-aligned** in key moments — alerts, onboarding, sheet titles. Section headers in lists/forms use **title-style capitalization**, no more ALL CAPS.
- **Legibility on glass**: text/symbols on Liquid Glass are monochrome and flip light/dark with the material; use vibrant label colors on standard materials.
- **Line length**: readable content guide ≈ 672pt (iPad/Mac); avoid lines over ~80 characters.
- **Numbers**: tabular figures for columns/timers (`font-variant-numeric: tabular-nums`; SF has monospaced digits variant).
- Right-to-left: use system text alignment (leading/trailing), never hard-code left.

## Web display type

Sources: the largest iOS text style is Large Title, 34/41 (`../../Apple-Style-HIG/reference/hig/typography.md`). The SF Pro tracking table in the same file lists values for iOS point sizes; applying them to CSS pixels is a visual heuristic.

- *Project default* — marketing headlines go beyond 34pt, so they use a fluid `clamp()` scale. No Apple size applies to a hero. Use `rem` in `clamp()` so the reader's default font size still applies (WCAG 1.4.4):

  ```css
  :root {
    --site-display-xl: clamp(2.5rem, 1.5rem + 4.5vw, 5rem);    /* about 40 → 80 px */
    --site-display-l:  clamp(2rem, 1.25rem + 3vw, 3.5rem);     /* about 32 → 56 px */
  }
  .hero-title { font: 700 var(--site-display-xl)/1.05 var(--as-font-display); text-wrap: balance; }
  ```

  These class names are examples. The reference pattern is `.as-site-hero-title` in `website-patterns.md` (*Hero and display type*), with the same numbers defined as `--as-display-1` and `--as-display-2` in `../web/patterns/hero.css`.
- *Official data, heuristic use* — tracking. For SF Pro the HIG table is positive from 24 to 76pt (+0.22pt at 64pt; +0.40pt at 34pt) and 0 at 80pt and above. For SF on the web, keep display tracking near 0: about +0.004 to +0.008em at 48–64px, 0 at 80px and above. Do not copy generic negative display tracking onto SF. For a non-SF brand face, measure in the browser.
- *Project default* — `text-wrap: balance` on headlines and `text-wrap: pretty` on paragraphs. Both are progressive enhancement: browsers without them wrap as usual.
- *Project default* — CJK line breaks: `word-break: auto-phrase` (Chromium only; other browsers use `normal`) with `line-break: strict`. Treat `auto-phrase` as an enhancement, not a requirement.
- *Project default, caveat* — `word-break: keep-all` stops breaks between CJK characters, so a long Chinese line can overflow or not wrap at all. Use it for Korean text, or for short Chinese phrases with explicit breaks. Do not apply it to Chinese body text.
- *Visual heuristic* — CJK body line-height about 1.7; no faux italics for CJK (the font has no italic, and the browser slants it); `letter-spacing: 0` for CJK (also in `web-implementation.md`, *Two traps*).
- *Visual heuristic* — reading measure: Latin 60–75 characters (`ch`); CJK 35–45 characters, which is `max-inline-size: 40em` because 1em is one CJK character at body size. The HIG 672pt readable-width guide (`layout-and-shapes.md`) is a guide for running text, not a page cap.
- *Observed convention* — set `lang` (`zh-Hans`, `ja`, `ko`) on the element. Browsers use it to choose regional CJK glyph forms.
