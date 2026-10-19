# Web stylesheet sources

`../apple-style.css` and `../apple-style.min.css` are generated from these files. Edit the files here, then regenerate from the repository root:

```sh
python3 scripts/build-css.py          # write apple-style.css and apple-style.min.css
python3 scripts/build-css.py --check  # fail if the generated files are stale or a var(--as-*) is undefined
```

The files are concatenated in the order listed in `ORDER` in `scripts/build-css.py`. The cascade depends on that order, so keep it when adding a file, and put a new rule in the layer whose audience needs it.

The first five files are the **core layer**. A content website loads only these: `tokens.css`, `base.css`, `glass.css`, `controls.css` and `preferences.css`. The rest are for web applications and the desktop window.

| Order | File | Layer | Contents (original section) |
| --- | --- | --- | --- |
| 1 | `tokens.css` | core | 0 Root tokens (with the file header) |
| 2 | `base.css` | core | 1 Base and typography, 2 Shapes |
| 3 | `glass.css` | core | 3 Standard materials, 4 Liquid Glass, 5 Scroll edge effect |
| 4 | `controls.css` | core | 6 Buttons, form fields, status pills, badge |
| 5 | `preferences.css` | core | 7 Accessibility preferences for glass, buttons and fields; utilities |
| 6 | `app.css` | app | 6 Toolbar, tab bar, sidebar, sheet, menu, alert, 6a scrubbable controls, search, list, navigation bar; 6c listbox, dialog, toast, empty and loading states |
| 7 | `window.css` | app | 6b Desktop window (≥ 1024 px) |
| 8 | `density.css` | app | 6d Desktop web density |
| 9 | `app-preferences.css` | app | 7b Accessibility preferences for the components above |

`app-preferences.css` repeats `.as-icon`, `.as-sr-only` and `.as-safe-bottom` from `preferences.css`. They were the last rules of the old cascade, so they must stay last, or a list or sheet that also carries `.as-safe-bottom` loses its bottom padding. Change both copies together.

`var(--as-*)` names used here must be declared in a stylesheet, set by `liquid-glass.js` or `liquid-glass.mjs`, or used with a fallback. The check also covers `../patterns/*.css` when that folder exists.
