# Color — system palette and rules

Source: HIG *Color* (`Apple-Style-HIG/reference/hig/color.md`), *Dark Mode*, WWDC25 356. Values are for design reference; on Apple platforms use the semantic APIs (`Color.red`, `UIColor.systemBackground`) — they may shift between releases.

## System colors (RGB)
| Name | Light | Dark | Incr. contrast light | Incr. contrast dark |
|---|---|---|---|---|
| Red | 255 56 60 | 255 66 69 | 233 21 45 | 255 97 101 |
| Orange | 255 141 40 | 255 146 48 | 197 83 0 | 255 160 86 |
| Yellow | 255 204 0 | 255 214 0 | 161 106 0 | 254 223 67 |
| Green | 52 199 89 | 48 209 88 | 0 137 50 | 74 217 104 |
| Mint | 0 200 179 | 0 218 195 | 0 133 117 | 84 223 203 |
| Teal | 0 195 208 | 0 210 224 | 0 129 152 | 59 221 236 |
| Cyan | 0 192 232 | 60 211 254 | 0 126 174 | 109 217 255 |
| Blue | 0 136 255 | 0 145 255 | 30 110 244 | 92 184 255 |
| Indigo | 97 85 245 | 109 124 255 | 86 74 222 | 167 170 255 |
| Purple | 203 48 224 | 219 52 242 | 176 47 194 | 234 141 255 |
| Pink | 255 45 85 | 255 55 95 | 231 18 77 | 255 138 196 |
| Brown | 172 127 94 | 183 138 102 | 149 109 81 | 219 166 121 |

visionOS uses the dark values. Grays (iOS/iPadOS): gray 142 142 147 / 142 142 147 · gray2 174 174 178 / 99 99 102 · gray3 199 199 204 / 72 72 74 · gray4 209 209 214 / 58 58 60 · gray5 229 229 234 / 44 44 46 · gray6 242 242 247 / 28 28 30.

## Semantic (dynamic) colors — use these, never hard-code appearance
label / secondaryLabel (60%) / tertiaryLabel (30%) / quaternaryLabel (18%) · placeholderText · separator (translucent) / opaqueSeparator · link · systemBackground / secondary / tertiary · systemGroupedBackground / secondary / tertiary · systemFill / secondary / tertiary / quaternary. Web tokens: `--as-label`, `--as-bg`, `--as-bg-grouped-2`, `--as-fill`, … in `web/apple-style.css`.

Never redefine a semantic color's meaning (separator as text color, secondaryLabel as background).

## Rules
- **Use color sparingly in non-game apps**; it should support communication, not decorate. Reserve accent for primary actions/selection.
- **Avoid using the same color for interactive and non-interactive elements.**
- **Consider color-blindness**: don't rely on color alone; add shape/text (red/green pairs are the classic failure).
- **Test in Light, Dark, Increased Contrast, and on real devices** in different lighting. Provide light/dark + increased-contrast variants for every custom color.
- **Contrast**: aim for WCAG-style ratios (4.5:1 body text, 3:1 large text/UI); use system colors which are tuned for both appearances.
- **Color management**: work in sRGB or Display P3 (wide gamut for images where supported); don't assume P3 colors reproduce on sRGB displays.
- **Liquid Glass color**: glass has no inherent color. Tint only the background of the single primary action (prominent style). Keep bar symbols monochrome; colorful content → monochrome bars or a strongly differentiated accent. See `materials-and-liquid-glass.md`.
- **App accent color** (iOS/iPadOS/macOS): one brand color applied via the system; on macOS the user's chosen accent may override — design controls to look right with any accent and with graphite.
- **Dark Mode**: use semantic colors and elevated backgrounds (secondary/tertiary system backgrounds for layering), reduce white-point of saturated colors, avoid pure white text on pure black for large blocks, test with Increase Contrast + Reduce Transparency.
- Platform notes: tvOS — vibrant colors on dark, avoid large saturated fields; visionOS — content sits on glass, prefer vibrancy over opaque colors, saturated color can be overwhelming; watchOS — black background, color for meaning.
