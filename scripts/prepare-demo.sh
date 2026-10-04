#!/usr/bin/env bash
# Package static demo assets only. This command never deploys or changes settings.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:?usage: prepare-demo.sh NEW_OUTPUT_DIRECTORY}"
[ ! -e "$DEST" ] || { echo "Refusing existing output: $DEST" >&2; exit 1; }
mkdir -p "$DEST/demo" "$DEST/skills/Apple-Style/web"
cp "$ROOT"/demo/*.html "$ROOT"/demo/*.css "$ROOT"/demo/*.js "$DEST/demo/"
cp "$ROOT"/skills/Apple-Style/web/*.html "$ROOT"/skills/Apple-Style/web/*.css "$ROOT"/skills/Apple-Style/web/*.js "$DEST/skills/Apple-Style/web/"
printf '<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=demo/"><title>Apple-Style demos</title><a href="demo/">Open demos</a></html>\n' > "$DEST/index.html"
touch "$DEST/.nojekyll"
echo "Prepared $DEST (not deployed)"
