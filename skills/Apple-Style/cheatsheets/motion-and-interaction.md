# Motion, feedback & interaction

Source: HIG *Motion*, *Feedback*, *Gestures*, *Playing haptics*, *Loading*, *Launching*; WWDC25 219; WWDC18 "Designing Fluid Interfaces". Full text: `Apple-Style-HIG/reference/hig/motion.md` etc.

## Principles
- **Motion must communicate** (status, feedback, spatial relationships, results of actions). Never gratuitous; if you can't say what it tells the user, cut it.
- **Be brief and precise**; keep motion in sync with the user's gesture; respect **Reduce Motion** (replace movement with a fade/crossfade; disable parallax, elastic and morphing).
- **Interruptible & redirectable**: every animation can be grabbed mid-flight; the user's gesture velocity carries into the animation (springs). Never block input while animating.
- **Respond on pointer/touch-down**, not on release; provide continuous 1:1 feedback during drags; avoid artificial delays.
- Animate at the source: menus, sheets, popovers, action sheets **morph out of the control** that opened them; content stays anchored to where the user tapped.

## Liquid Glass motion vocabulary
- **Materialize** in/out (modulated lensing), not opacity-only fades.
- **Flex + illuminate** on press: the glass energizes with light under the finger; glow spreads to neighboring glass; gel-like slight expansion (~+4–6%) then springs back.
- **Morph** between states (`matchedGeometry`) within a `GlassEffectContainer`; shapes blend when closer than the container spacing.
- **Transient lift**: knobs (slider/toggle) turn into glass only while manipulated; the resting state stays quiet.
- **Scrubbing**: the standard controls are drag targets. Press the *selected* segment of a segmented control and slide to move the selection; throw a switch knob and it lands on the nearer side; a slider thumb tracks the finger. The moving part follows 1:1, **stretches along the drag axis** with velocity (gel flex), rubber-bands past the ends and settles on a spring. Selection updates live during the drag, not on release. Click-only versions of these controls are the most common tell of a non-Apple UI.
- **Tab bar minimize** on scroll down; **sheet** grows/opaques as it's dragged up; **focus recedes** when a window is inactive.

## Web spring/easing defaults (`web/apple-style.css`)
`--as-ease-spring` (bouncy linear() spring), `--as-ease-soft` (cubic-bezier .2 .8 .2 1); durations 160 / 320 / 560 ms. Use `transform`/`opacity` only for 60 fps; avoid animating `backdrop-filter`.
Press flex is `--as-flex-x` / `--as-flex-y` (default press 1.06 / 1.03) consumed by `.as-glass { transform: scale(…) }`; drag stretch is `--as-ind-sx` (segmented) and `--as-knob-sx` (slider). `LiquidGlass.init()` installs the scrubbing gestures on `.as-segmented`, `.as-toggle` and `.as-slider` and emits `change` — never add your own click handler on top.

## Feedback (`hig/feedback.md`)
- Show status unobtrusively (progress, checkmarks, subtle animation); confirm destructive actions; **avoid unnecessary alerts**.
- Haptics (iPhone/Watch/trackpad): use system patterns (success, warning, error, selection, impact) sparingly and consistently with the visual/audio feedback; never for every tap. `hig/playing-haptics.md`.
- Loading: show content as soon as possible; skeletons/placeholders over spinners; educate/entertain only if waits are long; never block navigation. Launch: static launch screen matching the first screen, restore state.

## Gestures (`hig/gestures.md`)
- Use standard gestures with standard meanings (tap, swipe back, pinch, long-press → context menu, pull to refresh). Don't override system gestures (edge swipes, Home indicator). Offer a visible alternative to every gesture-only action. Drag & drop with obvious drop targets and previews.
- Pointer (iPad/Mac): hover effects (`hoverEffect`), pointer shape changes, right-click = context menu, keyboard focus rings and full keyboard access.
- Undo/redo for destructive edits; shake-to-undo on iPhone; ⌘Z on Mac/iPad.
