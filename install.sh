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
case "$SRC$REF${TARGETS[*]:-}" in *$'\n'*|*$'\r'*) die "newlines in paths/refs are unsupported";; esac

# ---------------------------------------------------------------- source ----
# A clone is recognised by the skills it carries, so running the script from a
# checkout never re-downloads anything.
script_dir() {
  local s="${BASH_SOURCE[0]:-}"
  [ -n "$s" ] && [ -f "$s" ] || return 1
  cd "$(dirname "$s")" >/dev/null 2>&1 && pwd
}

is_checkout() {
  local name
  for name in "${SKILLS[@]}"; do
    [ -f "$1/skills/$name/SKILL.md" ] && [ ! -L "$1/skills/$name" ] || return 1
  done
}

# Receipts are outside installed content. Never infer ownership from a name.
hash_stream() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 | cut -d ' ' -f 1
  else sha256sum | cut -d ' ' -f 1; fi
}
fingerprint() (
  cd "$1" || exit 1
  local stat_style; stat_style="$(uname -s)"
  find . ! -path './.git' ! -path './.git/*' -print0 | while IFS= read -r -d '' path; do
    { printf '%s\0' "$path"
      if [ "$stat_style" = Darwin ]; then stat -f '%Lp' "$path" || exit 1; else stat -c '%a' "$path" || exit 1; fi
      if [ -L "$path" ]; then printf 'L'; readlink "$path"
      elif [ -f "$path" ]; then printf 'F'; cat "$path"
      elif [ -d "$path" ]; then printf 'D'
      else exit 1; fi
    } | hash_stream || exit 1
  done | LC_ALL=C sort | hash_stream
)
receipt() { printf 'apple-style-installer-v1\n%s\n%s\n%s\n' "$1" "$2" "$3"; }
owned() {
  local dst="$1" record="$2" mode value actual
  [ -f "$record" ] && [ ! -L "$record" ] || return 1
  [ "$(sed -n '1p' "$record")" = apple-style-installer-v1 ] || return 1
  mode="$(sed -n '2p' "$record")"; value="$(sed -n '4p' "$record")"
  if [ "$mode" = link ]; then
    [ -L "$dst" ] && [ "$(readlink "$dst")" = "$value" ]
  elif [ "$mode" = copy ]; then
    [ -d "$dst" ] && [ ! -L "$dst" ] || return 1
    actual="$(fingerprint "$dst")" || return 1
    [ "$actual" = "$value" ]
  else return 1; fi
}
remove_owned() { if [ -L "$1" ]; then rm "$1"; else rm -rf "$1"; fi; }
download() {
  local dest="$1" parent stage record
  parent="$(dirname "$dest")"; mkdir -p "$parent"
  record="$dest.receipt"
  mkdir "$dest.lock" 2>/dev/null || die "cache locked: $dest.lock"
  trap 'rmdir "$CACHE_DIR.lock" 2>/dev/null || true' EXIT
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    owned "$dest" "$record" || die "cache is unowned or modified: $dest; preserve it and choose --dir"
  fi
  stage="$(mktemp -d "$parent/.apple-style-download.XXXXXX")"
  if command -v git >/dev/null 2>&1; then
    git clone --depth 1 --branch "$REF" --quiet "https://github.com/$REPO_SLUG.git" "$stage/repo" || { rm -rf "$stage"; die "clone failed"; }
  else
    command -v curl >/dev/null 2>&1 || die "need git or curl"
    # The generic archive endpoint resolves both branch names and tags.
    curl -fSL --retry 2 "https://codeload.github.com/$REPO_SLUG/tar.gz/$REF" -o "$stage/source.tar.gz" &&
      mkdir "$stage/extracted" && tar -xzf "$stage/source.tar.gz" -C "$stage/extracted" || { rm -rf "$stage"; die "download/extract failed"; }
    mv "$stage"/extracted/* "$stage/repo"
  fi
  is_checkout "$stage/repo" || { rm -rf "$stage"; die "invalid downloaded repository"; }
  receipt copy "https://github.com/$REPO_SLUG@$REF" "$(fingerprint "$stage/repo")" > "$stage/receipt"
  if [ -e "$dest" ]; then mv "$dest" "$stage/previous"; fi
  if ! mv "$stage/repo" "$dest"; then
    [ ! -e "$stage/previous" ] || mv "$stage/previous" "$dest"
    die "cache replacement failed; previous source restored"
  fi
  mv "$stage/receipt" "$record"
  rm -rf "$stage"
  rmdir "$dest.lock"; trap - EXIT
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
if [ -d "$SRC" ]; then SRC="$(cd "$SRC" && pwd -P)"; fi
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
command -v shasum >/dev/null 2>&1 || command -v sha256sum >/dev/null 2>&1 || die "need shasum or sha256sum"
installed=0
skipped=0
for target in "${TARGETS[@]}"; do
  [ "$MODE" = uninstall ] || mkdir -p "$target"
  [ -d "$target" ] || continue
  target="$(cd "$target" && pwd -P)"
  # Reject any overlap, including a symlink alias of the source tree.
  if [ "$MODE" != uninstall ]; then
    case "$target/" in "$SRC/"*) die "source/target overlap: $target";; esac
    case "$SRC/" in "$target/"*) die "source/target overlap: $target";; esac
  fi
  records="$target/.apple-style-install"
  [ ! -L "$records" ] || die "receipt directory is a link: $records"
  mkdir -p "$records"
  mkdir "$records/lock" 2>/dev/null || die "installation locked: $records/lock (inspect interrupted run before removing)"
  trap 'rmdir "$records/lock" 2>/dev/null || true' EXIT
  for skill in "${SKILLS[@]}"; do
    dst="$target/$skill"; src="$SRC/skills/$skill"; record="$records/$skill"
    if [ -e "$dst" ] || [ -L "$dst" ]; then
      if ! owned "$dst" "$record"; then
        warn "preserved unowned or modified content: $dst"; skipped=$((skipped + 1)); continue
      fi
    elif [ "$MODE" = uninstall ]; then
      continue
    fi
    if [ "$MODE" = uninstall ]; then
      remove_owned "$dst"; rm -f "$record"; ok "removed owned $skill"; continue
    fi
    [ -f "$src/SKILL.md" ] && [ ! -L "$src" ] || die "missing or linked source skill: $src"
    stage="$(mktemp -d "$target/.apple-style-stage.XXXXXX")"
    if [ "$MODE" = copy ]; then
      cp -R "$src" "$stage/new"
      receipt copy "$src" "$(fingerprint "$stage/new")" > "$stage/receipt"
    else
      ln -s "$src" "$stage/new"
      receipt link "$src" "$src" > "$stage/receipt"
    fi
    if [ -e "$dst" ] || [ -L "$dst" ]; then mv "$dst" "$stage/previous"; fi
    if ! mv "$stage/new" "$dst"; then
      [ ! -e "$stage/previous" ] && [ ! -L "$stage/previous" ] || mv "$stage/previous" "$dst"
      die "replacement failed; previous installation restored"
    fi
    mv "$stage/receipt" "$record"
    rm -rf "$stage"
    installed=$((installed + 1)); ok "$MODE $skill"
  done
  rmdir "$records/lock"; trap - EXIT
 done
say "Done: $installed installed; $skipped preserved. Source checkout left in place."
[ "$skipped" -eq 0 ] || exit 2
