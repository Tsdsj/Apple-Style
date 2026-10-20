#!/usr/bin/env python3
"""Rewrite root-relative URLs in a static site's HTML to paths relative to each file.

Only the packaged copy of the reference site is rewritten (scripts/prepare-demo.sh). The repository copy keeps
root-relative paths, which is what the skill teaches. Standard library only.

Rewritten: href, src, srcset, action, poster, formaction, xlink:href, and content on <meta> when it is a bare
root-relative path or a refresh URL (content="0; url=/"). Each rewritten URL keeps its query and fragment.

Left alone: absolute URLs (https://...), protocol-relative (//cdn...), fragments, scheme URLs (mailto:, tel:,
data:), absolute og:image values, and text inside comments, <script> and <style> bodies.

A <base> element is refused, because it changes how relative URLs resolve.

Usage: python3 relativize-site.py SITE_DIR
  Rewrites every *.html under SITE_DIR in place. Exits 1 if a root-relative URL is still left after rewriting.
"""
import posixpath
import re
import pathlib
import sys

URL_ATTRS = {'href', 'src', 'action', 'poster', 'formaction', 'xlink:href'}
TAG_START = r'<[A-Za-z][A-Za-z0-9:-]*(?=[\s/>])(?:[^>"\']|"[^"]*"|\'[^\']*\')*>'
# Comments, <script>/<style> blocks (open tag rewritten, body kept), or any start tag. Order matters.
SCAN = re.compile(
    r'<!--.*?-->'
    r'|(?P<raw><(?P<rawname>script|style)\b(?:[^>"\']|"[^"]*"|\'[^\']*\')*>)(?P<body>.*?)(?P<close></(?P=rawname)\s*>)'
    r'|(?P<tag>' + TAG_START + r')',
    re.S | re.I,
)
TAG_NAME = re.compile(r'<([A-Za-z][A-Za-z0-9:-]*)')
ATTR = re.compile(r'''([^\s"'>/=]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'=<>`]+))?''')
SRCSET_URL = re.compile(r'(^|,)(\s*)([^\s]+?)(,*)(?=\s|$)')
REFRESH = re.compile(r'^(\s*\d+\s*;\s*url\s*=\s*)(.*)$', re.I)


class RelativizeError(ValueError):
    pass


def rewrite_url(url, file_dir):
    """Return the relative form of a root-relative URL, or None if the URL is not root-relative."""
    if not url.startswith('/') or url.startswith('//'):
        return None
    match = re.match(r'([^?#]*)(.*)$', url, re.S)
    path, suffix = match.group(1), match.group(2)
    if path == '' or path.endswith('/'):
        path += 'index.html'
    target = posixpath.normpath(path).lstrip('/')
    rel = posixpath.relpath(target, file_dir)
    if rel in ('.', '..'):      # a directory: keep the trailing slash
        rel += '/'
    if ':' in rel.split('/')[0]:
        rel = './' + rel
    return rel + suffix


def _srcset(value, file_dir, decide):
    def repl(m):
        token = m.group(3)
        new = decide('srcset', token, file_dir)
        return m.group(1) + m.group(2) + (new if new is not None else token) + m.group(4)
    return SRCSET_URL.sub(repl, value)


def _attr_value(name, tag_name, value, file_dir, decide):
    lname = name.lower()
    if lname == 'srcset':
        return _srcset(value, file_dir, decide)
    if lname == 'content' and tag_name == 'meta':
        refresh = REFRESH.match(value)
        if refresh:
            new = decide(lname, refresh.group(2), file_dir)
            return refresh.group(1) + new if new is not None else value
        if re.search(r'\s', value):
            return value
        new = decide(lname, value, file_dir)
        return new if new is not None else value
    if lname in URL_ATTRS:
        new = decide(lname, value, file_dir)
        return new if new is not None else value
    return value


def _rewrite_tag(tag, file_dir, decide):
    name_match = TAG_NAME.match(tag)
    if not name_match:
        return tag
    tag_name = name_match.group(1).lower()
    if tag_name == 'base':
        raise RelativizeError('<base> changes how relative URLs resolve; remove it before packaging')
    head_end = name_match.end()
    rest = tag[head_end:]
    edits = []
    for m in ATTR.finditer(rest):
        if m.group(2) is None:
            continue
        raw = m.group(3)
        quote = raw[0] if raw[0] in '"\'' else ''
        value = raw[1:-1] if quote else raw
        new = _attr_value(m.group(1), tag_name, value, file_dir, decide)
        if new != value:
            if quote and quote in new:
                raise RelativizeError('quote character inside rewritten value: ' + new)
            edits.append((m.start(3), m.end(3), quote + new + quote))
    for start, end, text in reversed(edits):
        rest = rest[:start] + text + rest[end:]
    return tag[:head_end] + rest


def _transform(text, file_dir, decide):
    def repl(m):
        if m.group('raw'):
            open_tag = _rewrite_tag(m.group('raw'), file_dir, decide)
            return open_tag + m.group('body') + m.group('close')
        if m.group('tag'):
            return _rewrite_tag(m.group('tag'), file_dir, decide)
        return m.group(0)
    return SCAN.sub(repl, text)


def relativize_html(text, file_dir='.'):
    """Return HTML text with root-relative URLs rewritten for a file in file_dir (posix, relative to the site root)."""
    def decide(_attr, url, directory):
        return rewrite_url(url, directory)
    return _transform(text, file_dir, decide)


def root_relative_refs(text, file_dir='.'):
    """Return the root-relative URLs still present in the HTML text (empty when fully relativized)."""
    found = []

    def decide(_attr, url, directory):
        if rewrite_url(url, directory) is not None:
            found.append(url)
        return None
    _transform(text, file_dir, decide)
    return found


def relativize_tree(site):
    """Rewrite every *.html under site in place. Returns (files_changed, problems)."""
    site = pathlib.Path(site)
    pending, problems = [], []
    for path in sorted(site.rglob('*.html')):
        rel = path.relative_to(site).as_posix()
        file_dir = posixpath.dirname(rel) or '.'
        text = path.read_bytes().decode('utf-8')
        new = relativize_html(text, file_dir)  # may raise before anything is written
        problems += ['%s: %s' % (rel, url) for url in root_relative_refs(new, file_dir)]
        if new != text:
            pending.append((path, new))
    if not problems:
        for path, new in pending:
            path.write_bytes(new.encode('utf-8'))
    return len(pending), problems


def main(argv):
    if len(argv) != 2:
        print('usage: relativize-site.py SITE_DIR', file=sys.stderr)
        return 2
    site = pathlib.Path(argv[1])
    if not site.is_dir():
        print('not a directory: %s' % site, file=sys.stderr)
        return 2
    try:
        changed, problems = relativize_tree(site)
    except RelativizeError as error:
        print('relativize-site: %s' % error, file=sys.stderr)
        return 1
    if problems:
        print('relativize-site: root-relative URLs left:', file=sys.stderr)
        for line in problems:
            print('  ' + line, file=sys.stderr)
        return 1
    print('relativize-site: %d HTML file(s) rewritten under %s' % (changed, site))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
