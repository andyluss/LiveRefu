import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'

/**
 * 媒体服务路由：`/media/**` → 工作区 `doc/` 下的视觉素材。
 *
 * 为什么需要它：画廊要展示的来源素材位于 `doc/refu-game-001/美术/`，
 * 在 Nuxt 工程目录**之外**。按 D2「doc/ 是唯一内容权威、站点不改写它」，
 * 我们既不复制这些文件进 `public/`，也不去动它们——
 * 而是在**路由层只读地**把它们暴露出来（见 docs/01 §二 的资产盘点）。
 *
 * 安全：只允许落在解析后的 `doc/` 根内的路径（含前缀检查，防目录穿越）。
 * 部署提示：生产环境建议前置 Caddy/Nginx 直接静态服务该目录并加缓存头（M3）。
 */

const WORKSPACE_ROOT = resolve(process.cwd(), '../..')
const DOC_ROOT = resolve(WORKSPACE_ROOT, 'doc')

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.html': 'text/html; charset=utf-8',
}

export default defineEventHandler((event) => {
  const raw = (getRouterParam(event, '_') ?? '').split('?')[0] ?? ''
  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: '缺少媒体路径' })
  }

  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: '路径编码非法' })
  }

  const abs = resolve(join(DOC_ROOT, normalize(decoded)))
  // 目录穿越防护：必须仍在 doc/ 之内
  if (abs !== DOC_ROOT && !abs.startsWith(DOC_ROOT + '/')) {
    throw createError({ statusCode: 403, statusMessage: '越界访问' })
  }
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    throw createError({ statusCode: 404, statusMessage: '媒体不存在' })
  }

  const ext = abs.slice(abs.lastIndexOf('.')).toLowerCase()
  setHeader(event, 'Content-Type', MIME[ext] ?? 'application/octet-stream')
  // 素材随 git 版本变化，用较长的缓存并允许按需重验证
  setHeader(event, 'Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400')
  return sendStream(event, createReadStream(abs))
})
