#!/usr/bin/env python3
"""Strict WWDC transcript renderer. Missing transcripts fail without writing."""
import html
from pathlib import Path
import re
import sys


def plain(text):
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', text))).strip()


def event(source, url=None):
    """'WWDC25', 'WWDC26', … from the page's canonical/og:url, else from url."""
    for pattern in (r'<link rel="canonical" href="[^"]*/videos/play/wwdc(\d{4})/',
                    r'<meta property="og:url" content="[^"]*/videos/play/wwdc(\d{4})/'):
        found = re.search(pattern, source)
        if found:
            return 'WWDC' + found[1][2:]
    found = re.search(r'/videos/play/wwdc(\d{4})/', url or '')
    return 'WWDC' + found[1][2:] if found else None


def render(source, url=None):
    title = re.search(r'<h1[^>]*>(.*?)</h1>', source, re.S)
    section = re.search(r'<li class="supplement transcript"[^>]*>(.*?)</li>\s*(?:<li class="supplement|</ul>)', source, re.S)
    if not title or not section:
        raise ValueError('WWDC title or transcript section missing')
    sentences = [plain(x) for x in re.findall(r'<span[^>]*class="sentence"[^>]*>(.*?)</span>', section[1], re.S)]
    if not sentences or not any(sentences):
        raise ValueError('WWDC transcript has no sentences')
    detail = source[source.find('data-supplement-id="details"'):]
    description = re.search(r'</div>\s*<p>(.*?)</p>', detail, re.S)
    intro = plain(description[1]) + '\n\n' if description else ''
    paragraphs = [' '.join(sentences[i:i+6]) for i in range(0, len(sentences), 6)]
    chapters = re.findall(r'data-start-time="\d+">(\d+:\d+) - <a[^>]*>(.*?)</a>', source)
    label = event(source, url)
    return '# ' + plain(title[1]) + (f' ({label})' if label else '') + '\n\n' + intro + '## Chapters\n' + '\n'.join(f'- {a} {plain(b)}' for a, b in chapters) + '\n\n## Transcript\n\n' + '\n\n'.join(paragraphs) + '\n'


if __name__ == '__main__':
    for name in sys.argv[1:]:
        path = Path(name)
        result = render(path.read_text(encoding='utf-8'))
        temporary = path.with_suffix('.md.tmp')
        temporary.write_text(result, encoding='utf-8')
        temporary.replace(path.with_suffix('.md'))
