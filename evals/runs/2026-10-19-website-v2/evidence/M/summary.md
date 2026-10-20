# check-site summary

Site: `/home/user/Apple-Style/evals/runs/2026-10-19-website-v2/sites/M`

Base: http://127.0.0.1:9506 · pages: 7 · widths: 320, 390, 768, 1024, 1440 · 73 s · axe: yes · Lighthouse: yes

**Totals:** pass 7 · fail 5 · not checked 0 · not applicable 1

## Not checked (not a pass)

None.

## Results

| # | Review item | Check | Status | Key evidence |
|---|---|---|---|---|
| 1 | Crawl and anchors | Broken internal links and #anchors | pass | 7 pages, 209 internal links, 110 #anchors: all resolve |
| 2 | Per-page metadata | Metadata, headings and landmarks per page | fail | /index.html: no canonical link (+13 more) |
| 3 | 320 px overflow | Horizontal overflow at each width | fail | /index.html @320px: page is 11 px wider than the viewport; widest: button#theme-toggle.theme-btn right edge at 331 px (+6 more) |
| 4 | Running-text links | Links in running text distinguishable without colour | pass | 8 running-text link(s): each underlined, or with a border or background |
| 5 | axe light and dark | axe-core WCAG 2.2 AA and best practice, light and dark | pass | axe ran 14 page × scheme times: no serious or critical violations |
| 6 | Keyboard narrow menu | Narrow-screen menu: Tab, Enter, Esc, focus return | pass | header button[aria-expanded][aria-controls] reached by Tab (2 presses); Enter opens, Esc closes, focus returns |
| 7 | Focus visible | Focus indicator on the first 20 Tab stops | pass | 20 Tab stops, each with a visible focus indicator |
| 8 | Form empty and valid submit | Form errors and focus; success message | not applicable | no page with a form found (set FORM=/path to choose one) |
| 9 | Deep-path 404 | Missing deep path: 404, noindex, styles | fail | the 404 response for /a/b/c/missing-xyz has no noindex robots meta (add a 404.html with noindex) |
| 10 | No-JS browsing | Primary navigation and main content without JavaScript | fail | /index.html @390px: 3 of 3 primary nav links not visible without JS: "Quick start", "API reference", "Changelog" (+6 more) |
| 11 | Preferences | Reduced motion and forced colours | pass | reduced motion: no animation or transition over 10 ms on load; forced colours: controls stay visible |
| 12 | Budget and LCP | Render-blocking CSS and JS budget; optional Lighthouse | fail | scripts without defer/async: /assets/app.js |
| 13 | Console and requests | Console errors, failed and external requests | pass | 7 pages: no console errors, page errors or failed requests; external origins listed: 0 |

## Details

### 1 Crawl and anchors: pass


### 2 Per-page metadata: fail

- /index.html: no canonical link
- /index.html: no color-scheme meta
- /quick-start.html: no canonical link
- /quick-start.html: no color-scheme meta
- /reference/api.html: no canonical link
- /reference/api.html: no color-scheme meta
- /changelog.html: no canonical link
- /changelog.html: no color-scheme meta
- /guides/configuration.html: no canonical link
- /guides/configuration.html: no color-scheme meta
- /guides/plugins.html: no canonical link
- /guides/plugins.html: no color-scheme meta
- /guides/troubleshooting.html: no canonical link
- /guides/troubleshooting.html: no color-scheme meta

### 3 320 px overflow: fail

- /index.html @320px: page is 11 px wider than the viewport; widest: button#theme-toggle.theme-btn right edge at 331 px
- /quick-start.html @320px: page is 11 px wider than the viewport; widest: button#theme-toggle.theme-btn right edge at 331 px
- /reference/api.html @320px: page is 11 px wider than the viewport; widest: table right edge at 529 px
- /changelog.html @320px: page is 11 px wider than the viewport; widest: button#theme-toggle.theme-btn right edge at 331 px
- /guides/configuration.html @320px: page is 11 px wider than the viewport; widest: table right edge at 529 px
- /guides/plugins.html @320px: page is 11 px wider than the viewport; widest: table right edge at 529 px
- /guides/troubleshooting.html @320px: page is 11 px wider than the viewport; widest: table right edge at 529 px

### 4 Running-text links: pass


### 5 axe light and dark: pass


### 6 Keyboard narrow menu: pass


### 7 Focus visible: pass


### 8 Form empty and valid submit: not applicable

Reason: no page with a form found (set FORM=/path to choose one)


### 9 Deep-path 404: fail

- the 404 response for /a/b/c/missing-xyz has no noindex robots meta (add a 404.html with noindex)

### 10 No-JS browsing: fail

- /index.html @390px: 3 of 3 primary nav links not visible without JS: "Quick start", "API reference", "Changelog"
- /quick-start.html @390px: 3 of 3 primary nav links not visible without JS: "Quick start", "API reference", "Changelog"
- /reference/api.html @390px: 3 of 3 primary nav links not visible without JS: "Quick start", "API reference", "Changelog"
- /changelog.html @390px: 3 of 3 primary nav links not visible without JS: "Quick start", "API reference", "Changelog"
- /guides/configuration.html @390px: 3 of 3 primary nav links not visible without JS: "Quick start", "API reference", "Changelog"
- /guides/plugins.html @390px: 3 of 3 primary nav links not visible without JS: "Quick start", "API reference", "Changelog"
- /guides/troubleshooting.html @390px: 3 of 3 primary nav links not visible without JS: "Quick start", "API reference", "Changelog"

### 11 Preferences: pass


### 12 Budget and LCP: fail

render-blocking CSS ≈ 7.9 KB minified (budget 80 KB); JS 4.7 KB as served; Lighthouse median LCP 903 ms, performance 100 (3 runs)

- scripts without defer/async: /assets/app.js

### 13 Console and requests: pass
