# Rule scope and evidence

Choose four things independently before applying the design system:

1. **Target platform:** iOS, iPadOS, macOS, another platform, or cross-platform web. Use the product brief, not viewport width or UA sniffing.
2. **Application type:** native window/document app, web application, content site, landing page, or an existing product being adapted. Preserve established navigation and design constraints.
3. **Input:** touch, pointer, keyboard, assistive technology, or a combination. A wide iPad still needs touch targets; a narrow Mac window still needs keyboard access.
4. **Available container:** actual width/height, zoom, safe areas, text scaling and surrounding panes. Reflow, collapse or disclose panes without changing platform identity.

A 1366px iPad is not a Mac. A 700px Mac window is not an iPhone. A desktop browser page does not need a fake native window, sidebar or inspector. Use `.as-window` and `data-platform="macos"` only for an explicitly chosen Mac-like application surface. The stylesheet's 768/1024/1280px breakpoints and 264/380px pane widths are project defaults, not Apple platform detectors or official specifications.

## Strength of a rule

| Label | Meaning | Example and source | Scope |
|---|---|---|---|
| Official requirement | A normative standard or an explicit platform/API constraint; cite the exact section and version | [WCAG 2.2 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum): ordinary text needs 4.5:1; large text 3:1, with listed exceptions | Web accessibility conformance; evaluate rendered foreground/background |
| Official recommendation | Apple's HIG or WAI-ARIA APG advice; preserve words such as “consider”, “prefer”, “in general” | [Apple Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Windows](https://developer.apple.com/design/human-interface-guidelines/windows), [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) | Apply the named platform section and the actual app type; inspectors are optional |
| Project default | A choice in this CSS/JS implementation | Semantic action colors, responsive breakpoints, lens budget, pane widths | Override after measuring the product; not an Apple mandate |
| Visual heuristic | An aesthetic starting point | Clean glass interiors, restrained motion, concentric nested shapes, sparse tint | Judge with rendered examples and product needs; do not call stylistic disagreement a conformance failure |

Material guidance: [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials) distinguishes content and navigation/control layers. Prefer standard materials in content and regular glass for appropriate floating controls. Follow the platform's exceptions (including visionOS), system components and accessibility settings. The Web effect is an approximation, not Apple's renderer.

Keyboard models: [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), [Radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/), [Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/). These patterns explain ARIA behavior; simply adding a role is not validation. WCAG [2.5.8 target size](https://www.w3.org/TR/WCAG22/#target-size-minimum) includes exceptions; this project prefers at least 24 CSS px for pointer targets and 44 CSS px when coarse input is available. CSS px and native pt are not interchangeable measurements.

## Evidence states

Record each applicable check as **checked** (pass/fail with method and evidence), **not checked** (reason and next step), or **not applicable** (scope justification). Source inspection, computed style, Chromium automation, another browser and a screen-reader test are different evidence. Reading a checklist does not pass it. Do not infer Safari, Firefox, VoiceOver, performance gains or model quality gains from Chromium tests.
