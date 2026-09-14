# Accessibility, inclusion, privacy, writing

Source: HIG *Accessibility*, *Inclusion*, *VoiceOver*, *Privacy*, *Writing*, *Right to left*, *Dark Mode*. Full text in `Apple-Style-HIG/reference/hig/`.

## Non-negotiables
- Every interactive element: **≥ 44×44 pt**, an **accessibility label** (what it is), optional hint (what it does), correct **trait/role**; icon-only buttons especially.
- **Dynamic Type** everywhere; layouts reflow to AX5; no clipped or truncated essential text.
- **Color is never the only signal**; contrast ≥ 4.5:1 body / 3:1 large & UI; supports **Increase Contrast**, **Reduce Transparency**, **Reduce Motion**, **Bold Text**, **Button Shapes**, **Differentiate Without Color**, Smart Invert (mark images to not invert).
- **VoiceOver**: logical reading order (top→bottom, leading→trailing), grouped controls, custom actions for swipe/drag alternatives, announce dynamic changes, headers for navigation, rotor-friendly structure. Test with VoiceOver, Switch Control, Voice Control (labels must match visible text), Full Keyboard Access.
- Motion: parallax/zoom/spin off under Reduce Motion; autoplaying video/animation pausable; no flashing > 3 Hz.
- Audio: captions/transcripts; never sound-only feedback; respect silent switch.
- Liquid Glass honors these automatically; custom glass must implement the same modifiers (see `materials-and-liquid-glass.md`).

## Inclusion (`hig/inclusion.md`)
- Welcoming, non-gendered language; diverse imagery; avoid idioms and culturally narrow metaphors; support pronoun choices; don't make assumptions about ability, age, gender, family, or geography. Test with people who differ from you.

## Privacy (`hig/privacy.md`)
- Ask for permission **in context**, right before the feature needs it, with a clear purpose string; never pre-prompt with a fake dialog; degrade gracefully when denied; collect only what's needed; use privacy nutrition labels honestly; App Tracking Transparency before tracking; Sign in with Apple as an option when offering third-party sign-in.

## Writing (`hig/writing.md`)
- Clear, concise, conversational; **sentence case for body/messages, title case for buttons and titles** (iOS/macOS); verbs for buttons ("Delete", not "OK" for destructive); "you/your" not "the user"; avoid jargon, exclamation marks, and "please"; error messages say what happened and how to fix it; be consistent in terminology with the platform (e.g., "tap" on iOS, "click" on macOS, "Choose", "Settings").

## Internationalization (`hig/right-to-left.md`)
- Leading/trailing, not left/right; mirror directional UI (back chevrons, progress) but not media controls/clocks/graphs of time; test with long German/Finnish strings and Arabic/Hebrew; locale-aware dates/numbers; avoid text in images.

## Dark Mode (`hig/dark-mode.md`)
- Semantic colors; elevated surfaces via secondary/tertiary backgrounds; reduce saturation glare; dark-mode variants for images/icons where needed; test with Increase Contrast; the user may schedule appearance — never force a mode unless the content demands it (e.g., media).
