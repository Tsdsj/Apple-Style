# Web stylesheet sources

`../apple-style.css` and `../apple-style.min.css` are generated from these files. Edit the files here, then regenerate from the repository root:

```sh
python3 scripts/build-css.py          # write apple-style.css and apple-style.min.css
python3 scripts/build-css.py --check  # fail if the generated files are stale or a var(--as-*) is undefined
```

The files are concatenated in the order listed in `ORDER` in `scripts/build-css.py`. That order is the cascade order of the original single-file stylesheet, so keep it when adding a file.

| File | Original section |
| --- | --- |
| `tokens.css` | 0 Root tokens (with the file header) |
| `base.css` | 1 Base and typography, 2 Shapes |
| `glass.css` | 3 Standard materials, 4 Liquid Glass, 5 Scroll edge effect |
| `controls.css` | 6 Components, 6a Scrubbable controls |
| `window.css` | 6b Desktop window |
| `app.css` | 6c Web app components |
| `density.css` | 6d Desktop web density |
| `preferences.css` | 7 Accessibility and user preferences |

`var(--as-*)` names used here must be declared in a stylesheet, set by `liquid-glass.js` or `liquid-glass.mjs`, or used with a fallback. The check also covers `../patterns/*.css` when that folder exists.
