#!/usr/bin/env python3
"""Build the Web stylesheets from skills/Apple-Style/web/css/*.css; stdlib only.

apple-style.css      the css/ files concatenated in ORDER. The cascade depends on
                     this order (app before window before density, and the
                     preferences after the core components), so it is fixed
                     here rather than taken from directory listing order.
apple-style.min.css  a conservative minification of that output.

Also checks that every var(--as-*) used in css/ and patterns/ is defined (in a
stylesheet, or set from liquid-glass.js/.mjs), or is used only with a fallback.

Usage: build-css.py          write the generated files
       build-css.py --check  exit non-zero if they differ from the sources, or if
                             an undefined variable is found; writes nothing
"""
import argparse
from pathlib import Path
import re
import sys

WEB = Path(__file__).resolve().parents[1] / 'skills/Apple-Style/web'
CSS_DIR = WEB / 'css'
PATTERNS_DIR = WEB / 'patterns'
OUT = WEB / 'apple-style.css'
MIN = WEB / 'apple-style.min.css'
RUNTIME = [WEB / 'liquid-glass.js', WEB / 'liquid-glass.mjs']

# Concatenation order. Layers a content website needs come first, then the
# application layers, then the preferences that must win over the components:
#   core:  tokens, base, glass, controls, preferences
#   app:   app (6c), window (6b), density (6d), app-preferences (7b)
# The cascade depends on this order (window before density, app-preferences last),
# so it is fixed here rather than taken from directory listing order.
ORDER = ['tokens.css', 'base.css', 'glass.css', 'controls.css', 'preferences.css',
         'app.css', 'window.css', 'density.css', 'app-preferences.css']

COMMENT = re.compile(r'/\*.*?\*/', re.S)
DECLARED = re.compile(r'(?<![\w-])(--as-[\w-]+)\s*:')
USED = re.compile(r'var\(\s*(--as-[\w-]+)\s*(,?)')
RUNTIME_NAME = re.compile(r'--as-[\w-]+')


def fail(message):
    print(f'build-css: {message}', file=sys.stderr)
    sys.exit(1)


def read_sources():
    if not CSS_DIR.is_dir():
        fail(f'missing {CSS_DIR.relative_to(WEB.parents[2])}')
    present = {p.name for p in CSS_DIR.glob('*.css')}
    if present != set(ORDER):
        extra = sorted(present - set(ORDER))
        missing = sorted(set(ORDER) - present)
        fail(f'css/ does not match ORDER (extra: {extra or "none"}, missing: {missing or "none"})')
    return [(name, (CSS_DIR / name).read_bytes().decode('utf-8')) for name in ORDER]


def build_full(sources):
    # Each file ends with one newline; the blank line between sections is added here.
    return '\n'.join(text for _, text in sources)


def minify(css):
    """Drop comments, collapse whitespace, and remove the spaces that are never significant
    around { } ; , and after a colon. Strings are copied verbatim. Spaces around + - > ~ and
    inside parentheses are kept, so calc() and selectors keep their meaning."""
    segments = []  # (is_string, text)
    code = []
    i, n = 0, len(css)
    while i < n:
        if css.startswith('/*', i):
            end = css.find('*/', i + 2)
            if end < 0:
                raise ValueError(f'unterminated comment at offset {i}')
            before = css[i - 1] if i else ' '
            after = css[end + 2] if end + 2 < n else ' '
            safe = ' \t\r\n{};,'
            if before not in safe or after not in safe:
                # Removing a comment that touches a token could merge two tokens.
                raise ValueError(f'comment touches a token at offset {i}: {css[i-20:end+22]!r}')
            i = end + 2
        elif css[i] in '"\'':
            quote, j = css[i], i + 1
            while j < n and css[j] != quote:
                if css[j] == '\\':
                    j += 1
                if j < n and css[j] == '\n':
                    raise ValueError(f'newline in string at offset {i}')
                j += 1
            if j >= n:
                raise ValueError(f'unterminated string at offset {i}')
            segments.append((False, ''.join(code)))
            code = []
            segments.append((True, css[i:j + 1]))
            i = j + 1
        else:
            code.append(css[i])
            i += 1
    segments.append((False, ''.join(code)))

    out = []
    for is_string, text in segments:
        if is_string:
            out.append(text)
            continue
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\s*([{};,])\s*', r'\1', text)
        text = re.sub(r':\s+', ':', text)
        text = text.replace(';}', '}')
        out.append(text)
    return ''.join(out).strip() + '\n'


def undefined_variables(sources):
    """Return the names used without a fallback that are neither declared nor set by the runtime."""
    stripped = [COMMENT.sub('', text) for _, text in sources]
    pattern_files = sorted(PATTERNS_DIR.glob('*.css')) if PATTERNS_DIR.is_dir() else []
    stripped += [COMMENT.sub('', p.read_text(encoding='utf-8')) for p in pattern_files]
    declared, used = set(), {}
    for text in stripped:
        declared.update(DECLARED.findall(text))
        for name, comma in USED.findall(text):
            used.setdefault(name, []).append(bool(comma))
    runtime = set()
    for path in RUNTIME:
        runtime.update(RUNTIME_NAME.findall(path.read_text(encoding='utf-8')))
    problems = []
    for name in sorted(used):
        if name in declared or name in runtime or all(used[name]):
            continue
        problems.append(name)
    return problems, len(pattern_files)


def check(sources, full, minified):
    ok = True
    for path, expected in [(OUT, full), (MIN, minified)]:
        name = path.relative_to(WEB.parents[2]).as_posix()
        if not path.exists():
            print(f'MISSING {name}; run scripts/build-css.py')
            ok = False
        elif path.read_bytes() != expected.encode('utf-8'):
            print(f'STALE   {name} differs from css/ sources; run scripts/build-css.py')
            ok = False
        else:
            print(f'OK      {name}')
    problems, pattern_count = undefined_variables(sources)
    for name in problems:
        print(f'UNDEFINED {name} is used without a fallback and is never declared')
    if problems:
        ok = False
    print(f'checked {len(sources)} css files and {pattern_count} pattern files')
    return ok


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--check', action='store_true', help='verify generated files; write nothing')
    args = parser.parse_args()

    sources = read_sources()
    full = build_full(sources)
    minified = minify(full)

    if args.check:
        sys.exit(0 if check(sources, full, minified) else 1)

    problems, _ = undefined_variables(sources)
    if problems:
        for name in problems:
            print(f'UNDEFINED {name}', file=sys.stderr)
        fail('undefined custom properties; declare them or add a fallback')
    OUT.write_bytes(full.encode('utf-8'))
    MIN.write_bytes(minified.encode('utf-8'))
    print(f'wrote {OUT.name} ({len(full)} bytes) and {MIN.name} ({len(minified)} bytes)')


if __name__ == '__main__':
    main()
