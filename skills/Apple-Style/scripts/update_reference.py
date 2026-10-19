#!/usr/bin/env python3
"""Transactional reference refresh; stdlib only. No writes until all fetches parse."""
import argparse
from datetime import datetime, timezone
import fnmatch
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import urllib.parse
import urllib.request

from docc2md import render as render_docc
from transcript import render as render_transcript

APPLE = 'https://developer.apple.com'
DEFAULT = Path(__file__).resolve().parents[2] / 'Apple-Style-HIG/reference'
CHEATSHEETS = Path(__file__).resolve().parents[1] / 'cheatsheets'
REPO = Path(__file__).resolve().parents[3]
CATEGORIES = ('hig', 'liquid-glass', 'design-site', 'marketing')   # plus one wwdcNN directory per event


def digest(data):
    return hashlib.sha256(data).hexdigest()


VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}


def concealed(tag, attrs):
    """Interface chrome and content the page itself hides (filters, duplicated metadata)."""
    style = (attrs.get('style') or '').replace(' ', '').lower()
    classes = (attrs.get('class') or '').split()
    return (tag in ('button', 'select', 'form') or 'hidden' in attrs or attrs.get('aria-hidden') == 'true'
            or 'display:none' in style or 'visuallyhidden' in classes)


class DesignHTML(HTMLParser):
    """Only main/article content; fail closed on unfamiliar page structure."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.skip = 0
        self.hidden = []   # [tag, nesting] of a concealed element being skipped
        self.out = []
        self.links = []
        self.has_title = False
        self.cells = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('main', 'article'):
            self.depth += 1
        if not self.depth:
            return
        if self.hidden:
            if tag == self.hidden[0]:
                self.hidden[1] += 1
            return
        if tag in ('script', 'style', 'nav'):
            self.skip += 1
        if self.skip:
            return
        if tag not in VOID and concealed(tag, attrs):
            self.hidden = [tag, 1]
            return
        if tag in ('table', 'thead', 'tbody'):
            self.out.append('\n')
        elif tag == 'tr':
            self.out.append('\n'); self.cells = 0
        elif tag == 'th':
            self.out.append('\n\n### ')
        elif tag == 'td':
            self.out.append(' — ' if self.cells else ''); self.cells += 1
        if re.fullmatch(r'h[1-6]', tag):
            self.out.append('\n\n' + '#' * int(tag[1]) + ' ')
            self.has_title |= tag == 'h1'
        elif tag in ('p', 'div', 'section', 'br'):
            self.out.append('\n')
        elif tag == 'li':
            self.out.append('\n- ')
        elif tag == 'a':
            href = urllib.parse.urljoin(APPLE, attrs.get('href', ''))
            self.links.append(href if href.startswith(('https://', 'http://')) else '')
            self.out.append('[')
        elif tag == 'img' and attrs.get('alt'):
            self.out.append('[Image: ' + attrs['alt'] + ']')

    def handle_endtag(self, tag):
        if not self.depth:
            return
        if self.hidden:
            if tag == self.hidden[0]:
                self.hidden[1] -= 1
                if not self.hidden[1]:
                    self.hidden = []
            return
        if tag in ('script', 'style', 'nav') and self.skip:
            self.skip -= 1
        elif not self.skip:
            if tag == 'a' and self.links:
                href = self.links.pop()
                self.out.append('](' + href + ')' if href else ']')
            elif tag in ('p', 'li', 'tr', 'th') or re.fullmatch(r'h[1-6]', tag):
                self.out.append('\n')
        if tag in ('main', 'article'):
            self.depth -= 1

    def handle_data(self, data):
        if self.depth and not self.skip and not self.hidden:
            self.out.append(re.sub(r'\s+', ' ', data))


def render_html(source):
    parser = DesignHTML()
    parser.feed(source)
    content = re.sub(r'\n[ \t]+', '\n', ''.join(parser.out))
    content = '\n'.join(re.sub(r'(?<=\S)[ \t]{2,}', ' ', line.rstrip()) for line in content.splitlines())
    content = re.sub(r'\n{3,}', '\n\n', content).strip()
    if not parser.has_title or len(content) < 80:
        raise ValueError('Design page has no substantial main/article content with h1')
    return content + '\n'


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Apple-Style-reference-updater/1'})
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise ValueError(f'HTTP {response.status}: {url}')
        data = response.read(10_000_001)
        if len(data) > 10_000_000:
            raise ValueError('Response exceeds 10 MB')
        return data


def validate_source(source):
    path = Path(source['path'])
    if path.is_absolute() or '..' in path.parts or path.suffix != '.md' or not (path.parts[0] in CATEGORIES or re.fullmatch(r'wwdc\d\d', path.parts[0])):
        raise ValueError(f'Unsafe reference path: {path}')
    for key in ('url', 'fetch_url'):
        url = urllib.parse.urlparse(source[key])
        if url.scheme != 'https' or url.netloc != 'developer.apple.com':
            raise ValueError(f'Unexpected source origin: {source[key]}')
    if source['kind'] not in ('docc', 'html', 'transcript'):
        raise ValueError('Unknown source kind')


def index(reference, sources):
    lines = ['# Apple design reference index', '', 'Generated by update-reference.sh; provenance and SHA-256: [sources.json](sources.json).', 'Legacy timestamps marked null are unknown, not freshly fetched.', '']
    events = sorted({s['path'].split('/', 1)[0] for s in sources if re.fullmatch(r'wwdc\d\d', s['path'].split('/', 1)[0])})
    for category in (*CATEGORIES, *events):
        lines += ['## ' + category, '']
        for source in sorted(sources, key=lambda x: x['path']):
            if not source['path'].startswith(category + '/'):
                continue
            path = reference / source['path']
            if path.exists():
                title = next((line.lstrip('# ').strip() for line in path.read_text(encoding='utf-8').splitlines() if line.startswith('# ')), path.stem)
                lines.append(f"- [{title}]({source['path']}) · [Source]({source['url']})")
        lines.append('')
    return '\n'.join(lines)


def cited(text, stems):
    """Reference paths a cheatsheet cites: explicit paths (globs allowed),
    'WWDC25 219'-style session numbers and italic page names in Source lines."""
    paths = set(re.findall(r'\b((?:hig|liquid-glass(?:/api)?|design-site|marketing|wwdc\d\d)/[\w.*()-]+\.md)', text))
    paths |= {f'wwdc{year}/{number}-*.md' for year, number in re.findall(r'WWDC(\d\d) (\d{3})', text)}
    for line in re.findall(r'^Source:.*$', text, re.M):
        for name in re.findall(r'\*([^*]+)\*', line):
            slug = re.sub(r'[^a-z0-9]+', '-', name.split('→')[0].strip().lower()).strip('-')
            paths |= stems.get(slug, set())
    return paths


def recheck(changed, sources, cheatsheets=CHEATSHEETS):
    """Map each cheatsheet to the changed reference pages it cites."""
    stems = {}
    for source in sources:
        stems.setdefault(Path(source['path']).stem, set()).add(source['path'])
    reasons = {}
    for sheet in sorted(Path(cheatsheets).glob('*.md')):
        refs = cited(sheet.read_text(encoding='utf-8'), stems)
        hits = sorted(path for path in changed if any(fnmatch.fnmatch(path, ref) for ref in refs))
        if hits:
            try:
                name = sheet.resolve().relative_to(REPO).as_posix()
            except ValueError:
                name = sheet.name
            reasons[name] = hits
    return reasons


def final_url(url):
    """Where a canonical page now lives, following redirects; None if unknown."""
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'Apple-Style-reference-updater/1'})
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.geturl()
    except Exception:
        return None


def update(reference=DEFAULT, only=(), limit=None, discover=True, fetcher=fetch, cheatsheets=CHEATSHEETS, retire=(), resolver=None):
    reference = Path(reference).resolve()
    if resolver is None:   # an injected fetcher (tests, offline fixtures) never triggers network lookups
        resolver = final_url if fetcher is fetch else (lambda url: None)
    report = {'started_at': datetime.now(timezone.utc).isoformat(), 'applied': False, 'added': [], 'modified': [], 'unchanged': [], 'retired': [], 'failed': [], 'recheck_cheatsheets': [], 'recheck_reasons': {}}
    manifest = json.loads((reference / 'sources.json').read_text(encoding='utf-8'))
    sources = manifest['sources']
    for source in sources:
        validate_source(source)
    if len({s['path'] for s in sources}) != len(sources):
        raise ValueError('Duplicate source paths')
    if only and set(only) - {s['path'] for s in sources}:
        raise ValueError('Unknown --only path')
    if set(retire) - {s['path'] for s in sources} or set(retire) & set(only):
        raise ValueError('--retire needs known paths that are not also --only')
    # Apple renames and removes pages. A retired source leaves the manifest and
    # its file is deleted in the same transaction; its URL stays "known" so a
    # stale link elsewhere cannot rediscover it.
    retired = [s for s in sources if s['path'] in retire]
    sources[:] = [s for s in sources if s['path'] not in retire]
    report['retired'] = [s['path'] for s in retired]
    queue = [s for s in sources if not only or s['path'] in only]
    if limit is not None:
        queue = queue[:limit]
    known = {s['url'] for s in sources} | {s['url'] for s in retired}
    staged = {}
    for source in queue:
        try:
            payload = fetcher(source['fetch_url'])
            text = payload.decode('utf-8')
            if source['kind'] == 'docc':
                doc = json.loads(text)
                rendered = render_docc(doc) + '\n'
                if discover and not only and limit is None:
                    for item in doc.get('references', {}).values():
                        url = item.get('url', '').split('#')[0]
                        if url.startswith('/design/human-interface-guidelines/'):
                            canonical = APPLE + url
                            slug = url.rsplit('/', 1)[1]
                            if canonical not in known and re.fullmatch(r'[a-z0-9-]+', slug):
                                new = {'path': f'hig/{slug}.md', 'kind': 'docc', 'url': canonical, 'fetch_url': APPLE + '/tutorials/data' + url + '.json', 'fetched_at': None, 'sha256': None}
                                validate_source(new)
                                sources.append(new); queue.append(new); known.add(canonical)
            else:
                rendered = render_transcript(text, source['url']) if source['kind'] == 'transcript' else render_html(text)
            data = rendered.encode('utf-8')
            path = reference / source['path']
            if path.is_symlink() or any(p.is_symlink() for p in path.parents if p != reference.parent):
                raise ValueError('Reference path is a symbolic link')
            old = path.read_bytes() if path.exists() else None
            report['added' if old is None else 'unchanged' if old == data else 'modified'].append(source['path'])
            staged[source['path']] = data
            source.update(fetched_at=datetime.now(timezone.utc).isoformat(), sha256=digest(data), source_sha256=digest(payload), provenance='fetched')
        except Exception as error:
            failure = {'path': source['path'], 'url': source['url'], 'error': f'{type(error).__name__}: {error}'}
            if getattr(error, 'code', None) in (404, 410):
                moved = resolver(source['url'])
                if moved and moved.rstrip('/') != source['url'].rstrip('/'):
                    failure['moved_to'] = moved   # update url/fetch_url, or --retire if a new entry covers it
            report['failed'].append(failure)
    if report['added'] or report['modified'] or report['retired']:
        report['recheck_reasons'] = recheck(report['added'] + report['modified'] + report['retired'], sources + retired, cheatsheets)
        report['recheck_cheatsheets'] = list(report['recheck_reasons'])
    if report['failed']:
        return report  # all-or-nothing batch: valid local pages are untouched
    stage = Path(tempfile.mkdtemp(prefix='.reference-stage-', dir=reference.parent))
    backup = stage / 'previous'
    candidate = stage / 'next'
    try:
        shutil.copytree(reference, candidate, symlinks=True)
        for path, data in staged.items():
            dest = candidate / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        for source in retired:
            (candidate / source['path']).unlink(missing_ok=True)
        (candidate / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (candidate / 'INDEX.md').write_text(index(candidate, sources), encoding='utf-8')
        os.replace(reference, backup)
        try:
            os.replace(candidate, reference)
        except BaseException:
            os.replace(backup, reference)
            raise
        report['applied'] = True
    finally:
        # Keep recoverable previous data if rollback itself failed.
        if reference.exists():
            shutil.rmtree(stage)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path, default=DEFAULT)
    parser.add_argument('--only', action='append', default=[], help='exact manifest path; repeatable')
    parser.add_argument('--limit', type=int, help='bounded online validation; disables discovery')
    parser.add_argument('--no-discover', action='store_true')
    parser.add_argument('--retire', action='append', default=[], help='remove a manifest path and its file (page renamed or removed upstream); repeatable')
    parser.add_argument('--index-only', action='store_true', help='regenerate index from local files; no fetching')
    parser.add_argument('--report', type=Path, default=Path('reference-update-report.json'))
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error('--limit must be positive')
    lock = args.reference.parent / '.reference-update.lock'
    with lock.open('x') as handle:
        handle.write(str(os.getpid()))
    try:
        if args.index_only:
            sources = json.loads((args.reference / 'sources.json').read_text(encoding='utf-8'))['sources']
            temporary = args.reference / 'INDEX.md.tmp'
            temporary.write_text(index(args.reference, sources), encoding='utf-8')
            temporary.replace(args.reference / 'INDEX.md')
            return 0
        report = update(args.reference, args.only, args.limit, not args.no_discover, retire=args.retire)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.report.with_suffix('.tmp')
        temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(args.report)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1 if report['failed'] else 0
    finally:
        lock.unlink()


if __name__ == '__main__':
    raise SystemExit(main())
