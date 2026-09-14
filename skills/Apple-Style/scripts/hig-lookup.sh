#!/usr/bin/env bash
# Search the bundled Apple HIG / Liquid Glass reference library.
# Usage: hig-lookup.sh <keyword...>          full-text search (case-insensitive), shows file + matching lines
#        hig-lookup.sh --page <slug>         print one page (e.g. --page materials, --page buttons)
#        hig-lookup.sh --list                list all page slugs
#        hig-lookup.sh --rules <slug>        print only the bold rule sentences of a page (fast skim)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REF="${APPLE_STYLE_REF:-$HERE/../../Apple-Style-HIG/reference}"
[ -d "$REF" ] || { echo "reference library not found at $REF (set APPLE_STYLE_REF)" >&2; exit 1; }
case "${1:-}" in
  --list) ls "$REF/hig" | sed 's/\.md$//' | column -c 120 ;;
  --page) shift; f="$REF/hig/$1.md"; [ -f "$f" ] || f=$(ls "$REF"/liquid-glass/*"$1"*.md "$REF"/liquid-glass/api/*"$1"*.md "$REF"/wwdc25/*"$1"*.md 2>/dev/null | head -1); [ -n "$f" ] && cat "$f" || { echo "no page '$1'"; exit 1; } ;;
  --rules) shift; f="$REF/hig/$1.md"; grep -E '^\*\*[^*]+\*\*' "$f" | sed 's/\*\*//g' | cut -c1-220 ;;
  ""|-h|--help) sed -n '2,6p' "$0" ;;
  *) grep -ril --include='*.md' -- "$*" "$REF" | sort | while read -r f; do
       echo "### ${f#$REF/}"; grep -i -n -m 6 -- "$*" "$f" | cut -c1-240 | sed 's/^/  /'; done ;;
esac
