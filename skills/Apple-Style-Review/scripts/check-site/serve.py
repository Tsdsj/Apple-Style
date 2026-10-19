#!/usr/bin/env python3
"""Static server that behaves like a static host (GitHub Pages, Netlify, Cloudflare Pages).

usage: serve.py SITE_DIR PORT        (binds 127.0.0.1)

Files and directory index.html are served as usual. Directory listings are never shown.
A missing path gets SITE_DIR/404.html with status 404 (a bare 404 if there is no 404.html).
"""
import http.server
import os
import sys

ROOT = ''


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.webmanifest': 'application/manifest+json'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, *args):
        pass

    def list_directory(self, path):
        self.send_error(404, 'Not Found')
        return None

    def send_error(self, code, message=None, explain=None):
        page = os.path.join(ROOT, '404.html')
        if code == 404 and os.path.isfile(page):
            with open(page, 'rb') as f:
                body = f.read()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)
        else:
            super().send_error(code, message, explain)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    ROOT = os.path.realpath(sys.argv[1])
    if not os.path.isdir(ROOT):
        sys.exit(f'not a directory: {ROOT}')
    http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), Handler).serve_forever()
