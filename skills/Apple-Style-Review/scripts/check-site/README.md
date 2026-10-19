# check-site

Checks a static site directory in headless Chromium and writes a report for the Website section of
`../../SKILL.md`. It does not change the site. A passing run is evidence for the checks listed below on
the pages and browser used; it is not conformance, cross-browser or real-device evidence.

## Requirements

- Node 18+ and `@playwright/test` installed in the project you run it from (`npm i -D @playwright/test`).
  The tool adds no other dependency. Without it the spec cannot load; record every website check as
  `not checked`.
- A Chromium: `npx playwright install chromium`, or `CHROMIUM=/path/to/chrome` for an existing binary.
- Python 3 to serve the site (`PYTHON=python` where `python3` does not exist).
- Optional: axe-core 4.10.2 `axe.min.js` (`AXE`) and a Lighthouse CLI (`LIGHTHOUSE`).

## Run

```sh
# from the project that has @playwright/test; SITE is the folder that gets published
SITE=./dist OUT=./check-site-out \
  npx playwright test -c ~/.claude/skills/Apple-Style-Review/scripts/check-site/check-site.config.js
```

Use the path where the skill is installed (`install.sh` links `skills/<name>`). Exit status: `0` when no check
fails (`not checked` and `not applicable` never fail), `1` when a check fails or the tool cannot run.
Read `OUT/summary.md` either way: the "Not checked" list comes first.

## Inputs

| Variable | Default | Meaning |
|---|---|---|
| `SITE` | required | Site directory. Served by `serve.py` as a static host would. |
| `PORT` | `9311` | Local port for the server. |
| `OUT` | `./check-site-out` | Output directory, relative to the current directory. |
| `PAGES` | crawl | Comma list of paths to check instead of crawling from `/`. |
| `WIDTHS` | `320,390,768,1024,1440` | Widths for the overflow check. |
| `AXE` | none | Path to `axe.min.js`. Without it check 5 is `not checked`. |
| `MENU` | auto | CSS selector of the narrow-screen menu button (must have `aria-controls`). |
| `FORM` | auto | Path of the page whose form is tested (default: the first page with a form). |
| `LIGHTHOUSE` | none | Lighthouse CLI command. Runs three mobile audits of `/`. |
| `CHROMIUM` | Playwright's | Chromium executable for Playwright, and `CHROME_PATH` for Lighthouse. |
| `PYTHON` | `python3` | Python used for `serve.py`. |

Sizes are decimal: 1 KB = 1000 bytes (the eval README uses the same unit).

## Outputs

- `OUT/results.json`: every check with `status`, `summary` or `reason`, `evidence` (at most 20 lines,
  `evidenceTotal` gives the full count), `notes` and `data` (numbers, per-rule axe counts, budget bytes).
- `OUT/summary.md`: "Not checked" list, then one row per Review item, then details.
- `OUT/lighthouse-N.json` when `LIGHTHOUSE` is set.

Statuses: `pass`, `fail`, `not checked` (with the reason; never a pass), `not applicable` (with the scope).
An internal error in a check turns it into `not checked` with `error:` as the reason.

## Checks

| # | Review item | Measures | Fails when |
|---|---|---|---|
| 1 | Crawl and anchors | Same-origin links from `/` (or `PAGES`); `#id` targets on the target page | a link answers non-2xx, or an `#id` is missing |
| 2 | Per-page metadata | `lang`, unique non-empty `<title>`, description, canonical, viewport (zoom not disabled), `color-scheme` meta, one visible `h1`, no skipped heading levels, `main`, banner, contentinfo, skip link to an existing id | any item is missing (a page without `color-scheme` fails) |
| 3 | 320 px overflow | `scrollWidth > clientWidth + 1` at each width; widest element by right edge | any page at any width overflows |
| 4 | Running-text links | Visible links in `p, li, dd, td, blockquote, figcaption` (outside `nav`, inline, with other words in the block) with no underline, bottom border or background | a running-text link has none of these. The contrast to the text is reported; axe accepts 3:1 or more, this check does not |
| 5 | axe light and dark | axe-core, WCAG 2.0/2.1/2.2 A and AA plus best practice, every page, `prefers-color-scheme` light and dark, reduced motion on | any serious or critical node. Moderate and minor rules are listed as notes |
| 6 | Keyboard narrow menu | At 390 px: the toggle is reached by Tab, Enter sets `aria-expanded="true"` with links visible, Esc closes it, focus returns to the toggle | any step fails. With no visible toggle and visible links: `not applicable` |
| 7 | Focus visible | First 20 Tab stops on `/`: each has an outline or a changed box-shadow when focused | a stop shows no indicator |
| 8 | Form empty and valid submit | First form with a submit control: empty submit marks an invalid field, moves focus to the first one or to an error summary that links to it, and announces it; a valid submit (fills visible fields, never hidden or honeypot fields) shows a success message within 4 s. If the submit request gets a 4xx/5xx or fails (no backend on this host), the success half is `not checked` | an error is not marked, focus is wrong, or no success appears |
| 9 | Deep-path 404 | `/a/b/c/missing-xyz` returns 404, has `noindex`, loads its stylesheets and computes the same body font and colours as `/` | status is not 404, `noindex` is missing, a stylesheet fails or body styles differ |
| 10 | No-JS browsing | With JavaScript off, at 390 and 1280 px: primary nav links (first `header nav`) are visible or inside a closed `<details>`; `main` has text | a nav link is hidden or `main` is empty |
| 11 | Preferences | With reduced motion: no running CSS animation or transition over 10 ms on load. With forced colours: buttons and links keep a border, outline or text colour | an animation runs, or a control disappears |
| 12 | Budget and LCP | Render-blocking CSS in `<head>` (estimate, see limits); total JS as served; external scripts without `defer`/`async`; LCP and performance with `LIGHTHOUSE` | CSS estimate over 80 KB, or a blocking script. JS over 5 KB and LCP without a baseline are `not checked` |
| 13 | Console and requests | Console errors, page errors and failed requests per page (favicon 404 ignored); external origins listed | a page has an error or a failed request. External requests are listed, not failed |

## Limitations

- It serves the folder itself. Headers, compression, caching, redirects configured on the real host,
  and CDN behaviour are not tested. The 404 behaviour is the one `serve.py` emulates.
- Only pages reachable from `/` by links are checked, unless `PAGES` is given. Orphan pages are not.
  External links are not requested.
- Chromium only, headless, software rendering. Safari, Firefox, screen readers and real devices are not
  tested. Headless screenshots understate backdrop blur of 20 px or more; see `website.md` → Verification
  note. Nothing here judges how large glass looks.
- axe: `incomplete` results are not counted. Its results depend on page state; the check uses reduced motion
  and a 500 ms settle time so scroll-reveal animations finish first.
- Check 4 is a simpler rule than axe's `link-in-text-block`. On site B it lists 12 links on the same five pages
  where axe reports 5 nodes. Use axe for conformance and check 4 for the list of links to fix.
- Check 12 measures CSS with comments and whitespace removed, which is an estimate of minified size (real
  minifiers give less). A CSS result near 80 KB may be a false fail; minify and measure. JS is not minified
  here, so it is compared as served. The tool cannot tell skill JS from site JS.
- LCP is judged against the same page without the reference code (`website.md`). The tool reports the median
  of three runs but has no baseline.
- Check 6 needs the menu button to control the menu panel (`aria-controls`). Without it the open and closed
  counts can include header links.
- Check 8 fills fields with fixed sample text. A form that checks the content (postcode formats, codes) can
  stay blocked; the evidence says so.

## Validation

- `tests/fixtures/bad-site` (repo) has one planted problem per check. `tests/test_check_site.py` runs this tool
  against it and asserts each planted problem is a `fail`; the fixture is not installed with the skill.
- TODO: the reference-site run in CI is added with plan item 2.16/2.17 (the reference site does not exist yet).
