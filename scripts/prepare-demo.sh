#!/usr/bin/env bash
# Package static demo assets only. This command never deploys or changes settings.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:?usage: prepare-demo.sh NEW_OUTPUT_DIRECTORY}"
[ ! -e "$DEST" ] || { echo "Refusing existing output: $DEST" >&2; exit 1; }
mkdir -p "$DEST/demo" "$DEST/skills/Apple-Style/web"
cp "$ROOT"/demo/*.html "$ROOT"/demo/*.css "$ROOT"/demo/*.js "$DEST/demo/"
cp "$ROOT"/skills/Apple-Style/web/*.html "$ROOT"/skills/Apple-Style/web/*.css "$ROOT"/skills/Apple-Style/web/*.js "$ROOT"/skills/Apple-Style/web/*.mjs "$DEST/skills/Apple-Style/web/"
# Reference site (plan 2.16). The repository copy uses root-relative paths; the package copy is rewritten to paths
# relative to each file (plan 4.3), so it also works under a Pages sub-path such as /Apple-Style/.
cp -R "$ROOT/skills/Apple-Style/web/examples" "$DEST/skills/Apple-Style/web/"
python3 "$ROOT/scripts/relativize-site.py" "$DEST/skills/Apple-Style/web/examples/site"
# Landing page at the package root: the repository's root index.html, copied unchanged, so its relative links
# (demo/, skills/...) resolve the same way in the repository and in the package.
cp "$ROOT/index.html" "$DEST/index.html"
touch "$DEST/.nojekyll"
echo "Prepared $DEST (not deployed)"
