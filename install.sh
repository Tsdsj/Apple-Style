#!/usr/bin/env bash
# Install the Apple-Style skill set for Claude Code and Codex.
#   ./install.sh            symlink into ~/.claude/skills, ~/.codex/skills, ~/.agents/skills
#   ./install.sh --copy     copy instead of symlink
#   ./install.sh --project  install into ./.claude/skills and ./.codex/skills (cwd)
#   ./install.sh --uninstall
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS=(Apple-Style Apple-Style-Liquid-Glass Apple-Style-HIG Apple-Style-Review)
MODE=link; TARGETS=("$HOME/.claude/skills" "$HOME/.codex/skills" "$HOME/.agents/skills")
for a in "$@"; do case "$a" in
  --copy) MODE=copy ;;
  --uninstall) MODE=uninstall ;;
  --project) TARGETS=("$PWD/.claude/skills" "$PWD/.codex/skills") ;;
  *) echo "unknown option $a" >&2; exit 2 ;;
esac; done
for t in "${TARGETS[@]}"; do
  mkdir -p "$t"
  for s in "${SKILLS[@]}"; do
    dst="$t/$s"; src="$HERE/skills/$s"
    case $MODE in
      uninstall) [ -L "$dst" ] || [ -d "$dst" ] && rm -rf "$dst" && echo "removed $dst" || true ;;
      copy) rm -rf "$dst"; cp -R "$src" "$dst"; echo "copied  $dst" ;;
      link) if [ -e "$dst" ] && [ ! -L "$dst" ]; then echo "skip    $dst (existing directory, not a symlink)"; else ln -sfn "$src" "$dst"; echo "linked  $dst -> $src"; fi ;;
    esac
  done
done
[ $MODE = uninstall ] || echo "done. Try: /Apple-Style in Claude Code, or ask Codex to design something in Apple style."
