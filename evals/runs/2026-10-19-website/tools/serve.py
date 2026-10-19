# Static host emulation: like Netlify / GitHub Pages / Cloudflare Pages, a
# missing path is answered with the site's 404.html and status 404.
import http.server, os, sys
root, port = sys.argv[1], int(sys.argv[2])
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=root, **k)
    def log_message(self, *a): pass
    def send_error(self, code, message=None, explain=None):
        page = os.path.join(root, '404.html')
        if code == 404 and os.path.exists(page):
            body = open(page, 'rb').read()
            self.send_response(404); self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
        else: super().send_error(code, message, explain)
http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
