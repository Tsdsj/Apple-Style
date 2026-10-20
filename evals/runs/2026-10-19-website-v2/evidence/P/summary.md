# check-site summary

Site: `/home/user/Apple-Style/evals/runs/2026-10-19-website-v2/sites/P`

Base: http://127.0.0.1:9501 · pages: 2 · widths: 320, 390, 768, 1024, 1440 · 67 s · axe: yes · Lighthouse: yes

**Totals:** pass 10 · fail 0 · not checked 1 · not applicable 2

## Not checked (not a pass)

- **12 Budget and LCP**: LCP 1383 ms (median of 3, mobile) needs the same page without the reference code as baseline (website.md); not compared here

## Results

| # | Review item | Check | Status | Key evidence |
|---|---|---|---|---|
| 1 | Crawl and anchors | Broken internal links and #anchors | pass | 2 pages, 26 internal links, 19 #anchors: all resolve |
| 2 | Per-page metadata | Metadata, headings and landmarks per page | pass | 2 pages: metadata, one h1, no skipped levels, landmarks and skip link present |
| 3 | 320 px overflow | Horizontal overflow at each width | pass | 10 page × width combinations (320, 390, 768, 1024, 1440 px): no horizontal overflow |
| 4 | Running-text links | Links in running text distinguishable without colour | not applicable | no links in running text on the checked pages |
| 5 | axe light and dark | axe-core WCAG 2.2 AA and best practice, light and dark | pass | axe ran 4 page × scheme times: no serious or critical violations |
| 6 | Keyboard narrow menu | Narrow-screen menu: Tab, Enter, Esc, focus return | pass | [data-site-nav] button[aria-controls] reached by Tab (3 presses); Enter opens, Esc closes, focus returns |
| 7 | Focus visible | Focus indicator on the first 20 Tab stops | pass | 16 Tab stops, each with a visible focus indicator |
| 8 | Form empty and valid submit | Form errors and focus; success message | not applicable | no page with a form found (set FORM=/path to choose one) |
| 9 | Deep-path 404 | Missing deep path: 404, noindex, styles | pass | /a/b/c/missing-xyz returns 404 with noindex; styles match the home page |
| 10 | No-JS browsing | Primary navigation and main content without JavaScript | pass | 2 pages at 390 and 1280 px without JS: primary nav reachable, main content present |
| 11 | Preferences | Reduced motion and forced colours | pass | reduced motion: no animation or transition over 10 ms on load; forced colours: controls stay visible |
| 12 | Budget and LCP | Render-blocking CSS and JS budget; optional Lighthouse | not checked | render-blocking CSS ≈ 35.9 KB minified (budget 80 KB); JS 3.6 KB as served; Lighthouse median LCP 1383 ms, performance 100 (3 runs); LCP 1383 ms (median of 3, mobile) needs the same page without the reference code as baseline (website.md); not compared here |
| 13 | Console and requests | Console errors, failed and external requests | pass | 2 pages: no console errors, page errors or failed requests; external origins listed: 0 |

## Details

### 1 Crawl and anchors: pass


### 2 Per-page metadata: pass


### 3 320 px overflow: pass


### 4 Running-text links: not applicable

Reason: no links in running text on the checked pages


### 5 axe light and dark: pass


### 6 Keyboard narrow menu: pass


### 7 Focus visible: pass


### 8 Form empty and valid submit: not applicable

Reason: no page with a form found (set FORM=/path to choose one)


### 9 Deep-path 404: pass


### 10 No-JS browsing: pass


### 11 Preferences: pass


### 12 Budget and LCP: not checked

render-blocking CSS ≈ 35.9 KB minified (budget 80 KB); JS 3.6 KB as served; Lighthouse median LCP 1383 ms, performance 100 (3 runs)

Reason: LCP 1383 ms (median of 3, mobile) needs the same page without the reference code as baseline (website.md); not compared here


### 13 Console and requests: pass
