// 本地预览服务器：行为与常见静态托管一致——目录返回 index.html，不存在的路径返回 404.html（状态码 404）。
// 用法：node tools/serve.js [端口，默认 9102]
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2]) || 9102;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
};

http.createServer((req, res) => {
  let file;
  try {
    file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  } catch (e) {
    res.writeHead(400); res.end(); return;
  }
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch (e) { /* 交给下面处理 */ }
  fs.readFile(file, (err, data) => {
    if (err) {
      fs.readFile(path.join(root, '404.html'), (e2, page) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(e2 ? 'Not Found' : page);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log(`青柠记账站点预览：http://localhost:${port}/`));
