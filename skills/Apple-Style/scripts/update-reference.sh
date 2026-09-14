#!/usr/bin/env bash
# Re-crawl developer.apple.com and rebuild the reference library (requires python3 + curl, ~5 min).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REF="$HERE/../../Apple-Style-HIG/reference"
WORK="$(mktemp -d)"; cd "$WORK"; mkdir -p json extra
BASE="https://developer.apple.com/tutorials/data"
curl -sL "$BASE/design/human-interface-guidelines.json" -o hig.json
for s in getting-started foundations patterns components inputs technologies; do curl -sL "$BASE/design/human-interface-guidelines/$s.json" -o "sec-$s.json"; done
python3 - <<'PY'
import json,glob
urls=set()
for f in glob.glob("sec-*.json")+["hig.json"]:
    for r in json.load(open(f)).get("references",{}).values():
        u=r.get("url","")
        if u.startswith("/design/human-interface-guidelines/"): urls.add(u)
open("pages.txt","w").write("\n".join(sorted(urls))+"\n")
PY
python3 "$HERE/crawl.py"
for f in json/*.json; do python3 "$HERE/docc2md.py" "$f" > "$REF/hig/$(basename "$f" .json).md"; done
for u in TechnologyOverviews/adopting-liquid-glass TechnologyOverviews/liquid-glass SwiftUI/Applying-Liquid-Glass-to-custom-views SwiftUI/Landmarks-Building-an-app-with-Liquid-Glass; do
  n=$(basename "$u" | tr 'A-Z' 'a-z'); curl -sL "$BASE/documentation/$u.json" -o "extra/$n.json"; python3 "$HERE/docc2md.py" "extra/$n.json" > "$REF/liquid-glass/$n.md"; done
for v in 219 356 220 361 359 208 323 284 310; do curl -sL "https://developer.apple.com/videos/play/wwdc2025/$v/" -o "extra/video$v.html"; done
python3 "$HERE/transcript.py" extra/video*.html
for f in extra/video*.md; do n=$(basename "$f" .md | sed 's/video//'); t=$(head -1 "$f" | sed 's/^# //; s/ (WWDC25)//' | tr 'A-Z ' 'a-z-' | tr -cd 'a-z0-9-'); cp "$f" "$REF/wwdc25/$n-$t.md"; done
echo "updated $REF (INDEX.md not regenerated; edit by hand if pages were added)"
