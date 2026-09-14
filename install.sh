#!/usr/bin/env bash
# Apple-Style — installer for macOS / Linux.
#
#   Local (inside a clone):
#     ./install.sh                     link the skills into every agent dir found
#     ./install.sh --copy              copy instead of symlink
#     ./install.sh --project           install into ./.claude/skills and ./.codex/skills
#     ./install.sh --uninstall         remove what this installer put there
#
#   Remote (no clone needed — downloads into ~/.local/share/apple-style):
#     curl -fsSL https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.sh | bash
#     curl -fsSL .../install.sh | bash -s -- --copy
#
#   ./install.sh --update              refresh the downloaded copy and re-link
#   ./install.sh --help                full option list
set -euo pipefail

REPO_SLUG="Tsdsj/Apple-Style"
REF="main"
SKILLS=(Apple-Style Apple-Style-Liquid-Glass Apple-Style-HIG Apple-Style-Review)
CACHE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/apple-style"

MODE="link"          # link | copy | uninstall
SCOPE="user"         # user | project
UPDATE=0
QUIET=0
SRC=""
declare -a TARGETS=()

# ---------------------------------------------------------------- output ----
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  B=$'\033[1m'; DIM=$'\033[2m'; GRN=$'\033[32m'; YEL=$'\033[33m'; RED=$'\033[31m'; RST=$'\033[0m'
else
  B=""; DIM=""; GRN=""; YEL=""; RED=""; RST=""
fi
say()  { [ "$QUIET" = 1 ] || printf '%s\n' "$*"; }
ok()   { say "  ${GRN}✓${RST} $*"; }
warn() { printf '%s\n' "  ${YEL}!${RST} $*" >&2; }
die()  { printf '%s\n' "${RED}error:${RST} $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Apple-Style installer (macOS / Linux)

Usage: install.sh [options]

Install mode
  --link            symlink the skills (default; edits to the source show up live)
  --copy            copy the skills instead of symlinking
  --uninstall       remove the skills this installer created

Where
  --project         install into ./.claude/skills and ./.codex/skills (current directory)
  --to DIR          install into DIR as well (repeatable); implies an explicit target list
  --all             install into ~/.claude, ~/.codex and ~/.agents even if they don't exist yet

Source
  --update          re-download / git pull the cached copy, then install again
  --ref REF         branch or tag to download (default: main)
  --dir DIR         use DIR as the source checkout instead of downloading

Other
  --quiet           only print warnings and errors
  --help            this text
EOF
}

# ------------------------------------------------------------------ args ----
while [ $# -gt 0 ]; do
  case "$1" in
    --link)      MODE="link" ;;
    --copy)      MODE="copy" ;;
    --uninstall) MODE="uninstall" ;;
    --project)   SCOPE="project" ;;
    --to)        [ $# -ge 2 ] || die "--to needs a directory"; TARGETS+=("$2"); SCOPE="explicit"; shift ;;
    --all)       SCOPE="all" ;;
    --update)    UPDATE=1 ;;
    --ref)       [ $# -ge 2 ] || die "--ref needs a value"; REF="$2"; shift ;;
    --dir)       [ $# -ge 2 ] || die "--dir needs a directory"; SRC="$2"; shift ;;
    --quiet)     QUIET=1 ;;
    -h|--help)   usage; exit 0 ;;
    *)           die "unknown option: $1 (try --help)" ;;
  esac
  shift
done

# ---------------------------------------------------------------- source ----
# A clone is recognised by the skills it carries, so running the script from a
# checkout never re-downloads anything.
script_dir() {
  local s="${BASH_SOURCE[0]:-}"
  [ -n "$s" ] && [ -f "$s" ] || return 1
  cd "$(dirname "$s")" >/dev/null 2>&1 && pwd
}

is_checkout() { [ -f "$1/skills/Apple-Style/SKILL.md" ]; }

download() {
  local dest="$1"
  mkdir -p "$(dirname "$dest")"
  if [ -d "$dest/.git" ] && command -v git >/dev/null 2>&1; then
    say "${DIM}updating $dest${RST}"
    git -C "$dest" fetch --depth 1 origin "$REF" --quiet
    git -C "$dest" checkout --quiet FETCH_HEAD
  elif command -v git >/dev/null 2>&1; then
    say "${DIM}cloning $REPO_SLUG@$REF into $dest${RST}"
    rm -rf "$dest"
    git clone --depth 1 --branch "$REF" --quiet "https://github.com/$REPO_SLUG.git" "$dest"
  else
    command -v curl >/dev/null 2>&1 || die "need git or curl to download the skills"
    say "${DIM}downloading $REPO_SLUG@$REF into $dest${RST}"
    local tmp; tmp="$(mktemp -d)"
    curl -fsSL "https://codeload.github.com/$REPO_SLUG/tar.gz/refs/heads/$REF" | tar -xz -C "$tmp" \
      || die "download failed (check the network, or the --ref value)"
    rm -rf "$dest"
    mkdir -p "$(dirname "$dest")"
    mv "$tmp"/*/ "$dest"
    rm -rf "$tmp"
  fi
  is_checkout "$dest" || die "downloaded copy at $dest does not look like the Apple-Style repository"
}

if [ -z "$SRC" ]; then
  here="$(script_dir || true)"
  if [ -n "$here" ] && is_checkout "$here" && [ "$UPDATE" = 0 ]; then
    SRC="$here"                 # running from a clone
  elif [ "$MODE" = "uninstall" ]; then
    SRC="$CACHE_DIR"            # nothing to download just to remove links
  else
    download "$CACHE_DIR"
    SRC="$CACHE_DIR"
  fi
fi
if [ -d "$SRC" ]; then SRC="$(cd "$SRC" && pwd)"; fi
if [ "$MODE" != "uninstall" ] && ! is_checkout "$SRC"; then
  die "$SRC is not an Apple-Style checkout"
fi

# --------------------------------------------------------------- targets ----
# Only write into agent directories that actually exist, so the installer does
# not scatter empty ~/.codex or ~/.agents trees on machines that never use them.
if [ "$SCOPE" != "explicit" ]; then
  case "$SCOPE" in
    project) TARGETS=("$PWD/.claude/skills" "$PWD/.codex/skills") ;;
    all)     TARGETS=("$HOME/.claude/skills" "$HOME/.codex/skills" "$HOME/.agents/skills") ;;
    user)
      for parent in "$HOME/.claude" "$HOME/.codex" "$HOME/.agents"; do
        if [ -d "$parent" ]; then TARGETS+=("$parent/skills"); fi
      done
      if [ ${#TARGETS[@]} -eq 0 ]; then
        TARGETS=("$HOME/.claude/skills")
        warn "no agent directory found; defaulting to $HOME/.claude/skills"
      fi
      ;;
  esac
fi

# --------------------------------------------------------------- install ----
say "${B}Apple-Style${RST} ${DIM}·${RST} ${MODE} ${DIM}from${RST} $SRC"

installed=0
for target in "${TARGETS[@]}"; do
  [ "$MODE" = uninstall ] || mkdir -p "$target"
  [ -d "$target" ] || continue
  say "${DIM}$target${RST}"
  for skill in "${SKILLS[@]}"; do
    dst="$target/$skill"
    src="$SRC/skills/$skill"
    case "$MODE" in
      uninstall)
        if [ -L "$dst" ]; then
          rm -f "$dst"; ok "removed link $skill"
        elif [ -d "$dst" ] && [ -f "$dst/SKILL.md" ]; then
          rm -rf "$dst"; ok "removed $skill"
        fi
        ;;
      copy)
        rm -rf "$dst"
        cp -R "$src" "$dst"
        ok "copied $skill"
        installed=$((installed + 1))
        ;;
      link)
        if [ -e "$dst" ] && [ ! -L "$dst" ]; then
          warn "$dst exists and is not a symlink — left alone (use --copy to overwrite)"
        else
          ln -sfn "$src" "$dst"
          ok "linked $skill"
          installed=$((installed + 1))
        fi
        ;;
    esac
  done
done

if [ "$MODE" = uninstall ]; then
  say ""
  say "Uninstalled. The source checkout at $SRC was left in place."
  exit 0
fi

[ "$installed" -gt 0 ] || die "nothing was installed"

say ""
say "${GRN}Done.${RST} $installed skill(s) installed."
say "  Claude Code : type ${B}/Apple-Style${RST}, or just describe the UI you want."
say "  Codex       : the skills are discovered from ~/.codex/skills and ~/.agents/skills."
if [ "$MODE" = "link" ]; then
  say "  ${DIM}Linked, so 'git pull' in $SRC (or --update) refreshes every install.${RST}"
fi
exit 0
