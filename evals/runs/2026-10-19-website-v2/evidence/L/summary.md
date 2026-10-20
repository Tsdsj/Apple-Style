# check-site summary

Site: `/home/user/Apple-Style/evals/runs/2026-10-19-website-v2/sites/L`

Base: http://127.0.0.1:9504 · pages: 10 · widths: 320, 390, 768, 1024, 1440 · 86 s · axe: yes · Lighthouse: yes

**Totals:** pass 11 · fail 1 · not checked 1 · not applicable 0

## Not checked (not a pass)

- **12 Budget and LCP**: total JS 6.7 KB is over the 5 KB skill-JS budget, but the tool cannot tell skill JS from site JS: judge by the file list; LCP 945 ms (median of 3, mobile) needs the same page without the reference code as baseline (website.md); not compared here

## Results

| # | Review item | Check | Status | Key evidence |
|---|---|---|---|---|
| 1 | Crawl and anchors | Broken internal links and #anchors | pass | 10 pages, 180 internal links, 33 #anchors: all resolve |
| 2 | Per-page metadata | Metadata, headings and landmarks per page | fail | /features.html: 1 skipped heading level(s) |
| 3 | 320 px overflow | Horizontal overflow at each width | pass | 50 page × width combinations (320, 390, 768, 1024, 1440 px): no horizontal overflow |
| 4 | Running-text links | Links in running text distinguishable without colour | pass | 8 running-text link(s): each underlined, or with a border or background |
| 5 | axe light and dark | axe-core WCAG 2.2 AA and best practice, light and dark | pass | axe ran 20 page × scheme times: no serious or critical violations |
| 6 | Keyboard narrow menu | Narrow-screen menu: Tab, Enter, Esc, focus return | pass | header button[aria-expanded][aria-controls] reached by Tab (3 presses); Enter opens, Esc closes, focus returns |
| 7 | Focus visible | Focus indicator on the first 20 Tab stops | pass | 20 Tab stops, each with a visible focus indicator |
| 8 | Form empty and valid submit | Form errors and focus; success message | pass | empty submit marks and focuses the first invalid field; valid submit shows live region or success element: "感谢你的留言，我们已经收到。通常会在 1 个工作日内回复你。" |
| 9 | Deep-path 404 | Missing deep path: 404, noindex, styles | pass | /a/b/c/missing-xyz returns 404 with noindex; styles match the home page |
| 10 | No-JS browsing | Primary navigation and main content without JavaScript | pass | 10 pages at 390 and 1280 px without JS: primary nav reachable, main content present |
| 11 | Preferences | Reduced motion and forced colours | pass | reduced motion: no animation or transition over 10 ms on load; forced colours: controls stay visible |
| 12 | Budget and LCP | Render-blocking CSS and JS budget; optional Lighthouse | not checked | render-blocking CSS ≈ 16.1 KB minified (budget 80 KB); JS 6.7 KB as served; Lighthouse median LCP 945 ms, performance 100 (3 runs); total JS 6.7 KB is over the 5 KB skill-JS budget, but the tool cannot tell skill JS from site JS: judge by the file list; LCP 945 ms (median of 3, mobile) needs the same page without the reference code as baseline (website.md); not compared here |
| 13 | Console and requests | Console errors, failed and external requests | pass | 10 pages: no console errors, page errors or failed requests; external origins listed: 0 |

## Details

### 1 Crawl and anchors: pass


### 2 Per-page metadata: fail

- /features.html: 1 skipped heading level(s)

### 3 320 px overflow: pass


### 4 Running-text links: pass


### 5 axe light and dark: pass

- note: light: heading-order (moderate) 1 node(s) on 1 page(s) — not failing
- note: light: landmark-complementary-is-top-level (moderate) 1 node(s) on 1 page(s) — not failing
- note: dark: heading-order (moderate) 1 node(s) on 1 page(s) — not failing
- note: dark: landmark-complementary-is-top-level (moderate) 1 node(s) on 1 page(s) — not failing

### 6 Keyboard narrow menu: pass


### 7 Focus visible: pass


### 8 Form empty and valid submit: pass


### 9 Deep-path 404: pass


### 10 No-JS browsing: pass


### 11 Preferences: pass


### 12 Budget and LCP: not checked

render-blocking CSS ≈ 16.1 KB minified (budget 80 KB); JS 6.7 KB as served; Lighthouse median LCP 945 ms, performance 100 (3 runs)

Reason: total JS 6.7 KB is over the 5 KB skill-JS budget, but the tool cannot tell skill JS from site JS: judge by the file list; LCP 945 ms (median of 3, mobile) needs the same page without the reference code as baseline (website.md); not compared here


### 13 Console and requests: pass
