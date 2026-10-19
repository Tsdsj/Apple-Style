# Web stylesheet sources

`../apple-style.css` and `../apple-style.min.css` are generated from these files. Edit the files here, then regenerate from the repository root:

```sh
python3 scripts/build-css.py          # write apple-style.css, apple-style.min.css and the reference-site bundles
python3 scripts/build-css.py --check  # fail if a generated file is stale, or a var(--as-*) is undefined
```

The files are concatenated in the order listed in `ORDER` in `scripts/build-css.py`. The cascade depends on that order, so keep it when adding a file, and put a new rule in the layer whose audience needs it.

The first five files are the **core layer**. A content website loads only these: `tokens.css`, `base.css`, `glass.css`, `controls.css` and `preferences.css`. The rest are for web applications and the desktop window. A rule goes in the core only when a website pattern or the reference site uses it; rules that only applications use live in `app.css`, `window.css`, `density.css` or `app-preferences.css`.

| Order | File | Layer | Contents (original section) |
| --- | --- | --- | --- |
| 1 | `tokens.css` | core | 0 Root tokens (with the file header) |
| 2 | `base.css` | core | 1 Base and typography (without the macOS text sizes), 2 Shapes |
| 3 | `glass.css` | core | 3 Standard materials, 4 Liquid Glass (without groups, transient glass and the dim layer), 5 Scroll edge effect |
| 4 | `controls.css` | core | 6 Buttons, form fields, status pills, badge (without the Mac sizes, the mini and extra-large buttons, the form row and the select picker) |
| 5 | `preferences.css` | core | 7 Accessibility preferences for glass, buttons and fields; utilities |
| 6 | `app.css` | app | 6 Toolbar, tab bar, sidebar, sheet, menu, alert, 6a scrubbable controls, search, list, navigation bar; 6c listbox, dialog, toast, empty and loading states; the rules moved out of the core (glass groups, transient glass, dim layer, Mac sizes, select picker, mini and extra-large buttons, form row) |
| 7 | `window.css` | app | 6b Desktop window (≥ 1024 px) |
| 8 | `density.css` | app | 6d Desktop web density |
| 9 | `app-preferences.css` | app | 7b Accessibility preferences for the components above, including the select picker's own preference rules |

`app-preferences.css` repeats `.as-icon`, `.as-sr-only` and `.as-safe-bottom` from `preferences.css`. They were the last rules of the old cascade, so they must stay last, or a list or sheet that also carries `.as-safe-bottom` loses its bottom padding. Change both copies together.

`var(--as-*)` names used here must be declared in a stylesheet, set by `liquid-glass.js` or `liquid-glass.mjs`, or used with a fallback. The check also covers `../patterns/*.css` when that folder exists.

## Reference-site bundles

`../examples/site/css/` holds the bundles that the reference site loads (plan 2.16). `EXAMPLE_BUNDLES` in `scripts/build-css.py` lists the sources of each one, in order; the bundles are generated, minified, and checked by `--check`:

| Bundle | Sources | Used by |
| --- | --- | --- |
| `base.css` | core layers, site header, site navigation, site footer, section | every page |
| `landing.css` | hero, mockup, pricing, FAQ, motion, media | home page |
| `article.css` | article prose, legal page and 404 layout | article, privacy and 404 pages |
| `listing.css` | blog list, breadcrumb, pagination, tags | blog pages |
| `forms.css` | website form | contact page, blog newsletter |

`site.css` in the same folder is hand-written brand and layout glue. It is not generated and is loaded last. Add a file to a bundle only when a page of the reference site needs it, and keep the byte table in `../examples/site/README.md` in step.
