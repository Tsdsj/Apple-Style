#!/bin/bash
# usage: lh-run.sh SITE PORT OUT page1 page2 ...   (Lighthouse 12, mobile emulation, local static host)
SITE=$1; PORT=$2; OUT=$3; shift 3
D=$(dirname "$0"); LH=${LIGHTHOUSE:-npx lighthouse@12}
mkdir -p "$OUT"
python3 "$D/serve.py" "$SITE" "$PORT" & SRV=$!
sleep 1
for p in "$@"; do
  name=$(echo "$p" | sed 's#^/##; s#[/.]#_#g')
  CHROME_PATH=${CHROMIUM:-$CHROME_PATH} timeout 240 $LH "http://127.0.0.1:$PORT$p" --quiet --chrome-flags="--headless=new --no-sandbox" \
    --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="$OUT/lh-$name.json" >/dev/null 2>&1
done
kill $SRV
python3 - "$OUT" <<'PY'
import json, glob, sys, os
rows = []
for f in sorted(glob.glob(os.path.join(sys.argv[1], 'lh-*.json'))):
    d = json.load(open(f))
    cats = {k: round(v['score'] * 100) for k, v in d['categories'].items() if v['score'] is not None}
    fails = sorted({a for c in d['categories'].values() for r in c['auditRefs'] for a in [r['id']]
                    if d['audits'][a]['score'] is not None and d['audits'][a]['score'] < 0.9 and d['audits'][a]['scoreDisplayMode'] in ('binary', 'numeric') and r.get('weight', 0) > 0})
    m = d['audits']
    rows.append({'page': os.path.basename(f), **cats, 'LCP': m['largest-contentful-paint']['displayValue'], 'CLS': m['cumulative-layout-shift']['displayValue'], 'TBT': m['total-blocking-time']['displayValue'], 'below90': fails})
json.dump(rows, open(os.path.join(sys.argv[1], 'lighthouse.json'), 'w'), ensure_ascii=False, indent=2)
for r in rows: print(r)
PY
