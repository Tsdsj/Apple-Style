---
name: Apple-Style-Review
description: Use when auditing, reviewing or critiquing an existing screen, component, stylesheet or app against Apple's Human Interface Guidelines and the Liquid Glass design system — "does this look/feel like Apple", "HIG compliance check", "why does my glass UI look wrong", App Store design polish, or before shipping an Apple-style web or native UI built with the Apple-Style skills.
---

# Apple-Style-Review

Audit the authorized scope, using `../Apple-Style/cheatsheets/rules-and-evidence.md` for rule strength and platform applicability. Report findings first unless the user has already asked for fixes; existing repair authorization remains valid.

## Procedure

1. Record platform, app type, inputs, container sizes, tested revision and environment. A viewport width is not evidence of macOS. Preserve an existing product's navigation and design system.
2. Inventory relevant surfaces and controls. Identify content/control layers and the source supporting a recommendation. Distinguish accessibility defects from aesthetic preferences.
3. For every check below, record **checked** (pass/fail plus evidence), **not checked** (reason), or **not applicable** (scope). A checkbox tick or source-code claim alone is not a successful runtime test.
4. Prioritize actionable findings: Blocker for inaccessible core interaction/data loss; Major for broken behavior or hierarchy; Minor for polish. Do not label a layout “not Apple” solely for deviating from project defaults.

## Checks

| Area | What to inspect |
|---|---|
| Layers/material | Appropriate content/control separation, legibility over actual backgrounds, restrained nesting, regular/clear variants chosen for context; platform exceptions checked in HIG Materials |
| Color | Semantic colors; default light/dark ordinary text ≥4.5:1; selected rows and white-on-tint buttons included; custom tints measured; color is not the only meaning |
| Type/shapes | Readable fallback fonts and text scaling; concentric nested corners; shapes/density fit input and product; avoid enforcing project spacing as official numbers |
| Layout | Platform, product and container considered separately; wide iPad and narrow Mac remain their platform; ordinary websites need no artificial window, sidebar or inspector; zoom/reflow and key widths checked |
| Native Mac window, if applicable | HIG macOS Layout/Windows recommendations about critical bottom-edge actions; optional sidebar/inspector justified; toolbar groups and shortcuts fit the product; pane widths remain usable |
| Segmented controls | tabs for panels with aria-controls/labelled panels; radio group for values; one tab stop, focus follows arrows, wrap/Home/End, activation model explicit, disabled skipped, ARIA matches value |
| Switches/drag | standard click (including synthetic/AT click), keyboard and drag all operate; no double commit; pointercancel/lost capture restore or cancel; disabled controls do nothing |
| Other controls | native range semantics, labeled buttons, visible focus; divider keyboard and actual-width ARIA; menu keyboard model only where a menu role is used |
| Overlays | dialog labels, initial focus, Tab containment, inert background, Escape and focus return; menu dismissal and arrow navigation tested |
| Motion/preferences | Reduced motion/transparency and increased contrast observed, not just media queries located; motion interruptible; no unnecessary bounce |
| Lifecycle | repeated init, root scope, dynamic insertion/removal/remount, destroy; Observer/listener/timer/frame/filter cleanup; attach options survive resize/theme updates |
| Resources/performance | Avoid unnecessary filters/promotions; characterize actual devices and workload before claiming performance gains; budgets are project defaults |
| Delivery | Loading/empty/error/populated as applicable, mobile/coarse input and key widths, browser errors, source/manifest consistency and reference limitations |
| Browser/assistive technology | Chromium, Safari, Firefox, VoiceOver/NVDA each have separate evidence; unrun checks remain not checked |

Sources: `../Apple-Style-HIG/reference/INDEX.md` and `sources.json`; shared rule scope links the canonical HIG, WCAG and APG pages. Consult the matching platform section before suggesting native window conventions.

## Report format

| Check | Applicability | State | Result | Evidence / limitation |
|---|---|---|---|---|
| Keyboard | Web radio selector | checked | pass/fail | command, revision, browser, relevant output |
| VoiceOver | macOS assistive technology | not checked | unknown | manual session not run |
| Native window | ordinary content website | not applicable | — | no native window in scope |

| Priority | Element | Finding | Rule strength and source | Concrete fix |
|---|---|---|---|---|

Conclude with remaining decisions and coverage gaps. Do not claim conformance, cross-browser compatibility, performance improvement or Skill quality improvement beyond the evidence.
