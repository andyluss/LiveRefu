import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createApp } from './app.ts'

async function toRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? '127.0.0.1'
  const url = `http://${host}${req.url ?? '/'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach(v => headers.append(key, v))
    else headers.set(key, value)
  }
  const method = req.method ?? 'GET'
  if (method === 'GET' || method === 'HEAD') return new Request(url, { method, headers })
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return new Request(url, { method, headers, body: Buffer.concat(chunks) })
}

function writeResponse(res: ServerResponse, response: Response): void {
  res.statusCode = response.status
  for (const [key, value] of response.headers) {
    if (key.toLowerCase() === 'set-cookie') continue
    res.setHeader(key, value)
  }
  const cookies = response.headers.getSetCookie?.() ?? []
  if (cookies.length) res.setHeader('set-cookie', cookies)
  if (response.body === null || response.status === 204 || response.status === 304) {
    res.end()
    return
  }
  response.arrayBuffer().then(buffer => res.end(Buffer.from(buffer)))
}

export async function startServer(options: { appRoot: string; port?: number; host?: string }) {
  const app = await createApp(options.appRoot)
  const server = createServer((req, res) => {
    toRequest(req)
      .then(request => app.handle(request))
      .then(response => writeResponse(res, response))
      .catch(error => {
        console.error(error)
        res.statusCode = 500
        res.setHeader('content-type', 'text/plain; charset=utf-8')
        res.end('Internal Server Error')
      })
  })
  const port = options.port ?? app.config.server.port
  const host = options.host ?? app.config.server.host
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => resolve())
  })
  const address = server.address()
  const actualPort = typeof address === 'object' && address ? address.port : port
  return {
    app,
    server,
    url: `http://${host}:${actualPort}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
      app.close()
    },
  }
}
