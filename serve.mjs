import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), 'dist')
const port = Number(process.env.PORT || 3000)
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2'
}

const server = createServer((request, response) => {
  let file
  try {
    const url = new URL(request.url || '/', 'http://localhost')
    const requested = resolve(root, '.' + decodeURIComponent(url.pathname))
    if (requested !== root && !requested.startsWith(root + sep)) throw new Error('outside root')
    file = requested
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file) && !extname(file)) file = join(root, 'index.html')
    if (!existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Not found')
      return
    }
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }
  response.writeHead(200, {
    'Content-Type': mime[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff'
  })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  const stream = createReadStream(file)
  stream.on('error', () => {
    if (!response.headersSent) response.writeHead(500)
    response.end()
  })
  stream.pipe(response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Son of Anton preview listening on http://0.0.0.0:${port}`)
  console.log(`Serving ${root}`)
})

const stop = () => server.close(() => process.exit(0))
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
