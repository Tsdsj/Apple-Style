# check-site summary

Site: `/home/user/Apple-Style/evals/runs/2026-10-19-website-v2/sites/Q`

Base: http://127.0.0.1:9502 · pages: 2 · widths: 320, 390, 768, 1024, 1440 · 51 s · axe: yes · Lighthouse: yes

**Totals:** pass 6 · fail 4 · not checked 0 · not applicable 3

## Not checked (not a pass)

None.

## Results

| # | Review item | Check | Status | Key evidence |
|---|---|---|---|---|
| 1 | Crawl and anchors | Broken internal links and #anchors | pass | 2 pages, 24 internal links, 15 #anchors: all resolve |
| 2 | Per-page metadata | Metadata, headings and landmarks per page | fail | /index.html: no canonical link (+1 more) |
| 3 | 320 px overflow | Horizontal overflow at each width | pass | 10 page × width combinations (320, 390, 768, 1024, 1440 px): no horizontal overflow |
| 4 | Running-text links | Links in running text distinguishable without colour | not applicable | no links in running text on the checked pages |
| 5 | axe light and dark | axe-core WCAG 2.2 AA and best practice, light and dark | pass | axe ran 4 page × scheme times: no serious or critical violations |
| 6 | Keyboard narrow menu | Narrow-screen menu: Tab, Enter, Esc, focus return | not applicable | no menu toggle found at 390 px; 3 nav links are visible |
| 7 | Focus visible | Focus indicator on the first 20 Tab stops | pass | 14 Tab stops, each with a visible focus indicator |
| 8 | Form empty and valid submit | Form errors and focus; success message | not applicable | no page with a form found (set FORM=/path to choose one) |
| 9 | Deep-path 404 | Missing deep path: 404, noindex, styles | fail | the 404 response for /a/b/c/missing-xyz has no noindex robots meta (add a 404.html with noindex) (+3 more) |
| 10 | No-JS browsing | Primary navigation and main content without JavaScript | fail | /index.html @390px: 2 of 5 primary nav links not visible without JS: "功能", "客户" (+1 more) |
| 11 | Preferences | Reduced motion and forced colours | pass | reduced motion: no animation or transition over 10 ms on load; forced colours: controls stay visible |
| 12 | Budget and LCP | Render-blocking CSS and JS budget; optional Lighthouse | fail | scripts without defer/async: /script.js |
| 13 | Console and requests | Console errors, failed and external requests | pass | 2 pages: no console errors, page errors or failed requests; external origins listed: 0 |

## Details

### 1 Crawl and anchors: pass


### 2 Per-page metadata: fail

- /index.html: no canonical link
- /pricing.html: no canonical link

### 3 320 px overflow: pass


### 4 Running-text links: not applicable

Reason: no links in running text on the checked pages


### 5 axe light and dark: pass


### 6 Keyboard narrow menu: not applicable

Reason: no menu toggle found at 390 px; 3 nav links are visible


### 7 Focus visible: pass


### 8 Form empty and valid submit: not applicable

Reason: no page with a form found (set FORM=/path to choose one)


### 9 Deep-path 404: fail

- the 404 response for /a/b/c/missing-xyz has no noindex robots meta (add a 404.html with noindex)
- body fontFamily at the deep path differs from home: ""Times New Roman"" vs "-apple-system, BlinkMacSystemFont, "SF Pro Text", "
- body backgroundColor at the deep path differs from home: "rgba(0, 0, 0, 0)" vs "rgb(245, 245, 247)"
- body color at the deep path differs from home: "rgb(0, 0, 0)" vs "rgb(29, 29, 31)"

### 10 No-JS browsing: fail

- /index.html @390px: 2 of 5 primary nav links not visible without JS: "功能", "客户"
- /pricing.html @390px: 2 of 5 primary nav links not visible without JS: "功能", "客户"

### 11 Preferences: pass


### 12 Budget and LCP: fail

render-blocking CSS ≈ 13.0 KB minified (budget 80 KB); JS 2.7 KB as served

- scripts without defer/async: /script.js

### 13 Console and requests: pass
