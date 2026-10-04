#!/usr/bin/env bash
# Refresh all reference categories transactionally. Python 3 standard library only.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$HERE/update_reference.py" "$@"
