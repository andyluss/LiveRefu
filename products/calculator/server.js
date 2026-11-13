import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'

const ROOT = resolve(process.cwd())
const PORT = Number(process.env.PORT || 4220)
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/') { res.writeHead(302, { location: '/web/' }); res.end(); return }
    if (!pathname.endsWith('/') && !extname(pathname) && !pathname.startsWith('/src/')) {
      const asFile = await stat(join(ROOT, normalize(pathname))).catch(() => null)
      if (!asFile?.isFile()) { res.writeHead(302, { location: `${pathname}/` }); res.end(); return }
    }
    let file = join(ROOT, normalize(pathname))
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return }
    const info = await stat(file).catch(() => null)
    if (info?.isDirectory()) file = join(file, 'index.html')
    const data = await readFile(file).catch(() => null)
    if (!data) { res.writeHead(404); res.end('not found'); return }
    res.writeHead(200, {
      'content-type': MIME[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-cache',
    })
    res.end(data)
  } catch {
    res.writeHead(500); res.end('server error')
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`手边计算器：http://127.0.0.1:${PORT}/web/`)
})
