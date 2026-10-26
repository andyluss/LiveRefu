import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { HttpError } from './http.ts'

export interface UploadOptions {
  dir: string
  maxBytes?: number
  types?: string[]
}

export interface SavedUpload {
  path: string
  name: string
  size: number
  type: string
}

export class UploadError extends HttpError {
  constructor(status: number, message: string, code: string) {
    super(status, message, code)
  }
}

export async function saveUpload(file: unknown, options: UploadOptions): Promise<SavedUpload> {
  if (!(file instanceof File)) throw new UploadError(400, '缺少上传文件', 'UPLOAD_MISSING')
  const max = options.maxBytes ?? 5 * 1024 * 1024
  if (file.size > max) throw new UploadError(413, `文件不能超过 ${Math.round(max / 1024)} KiB`, 'UPLOAD_TOO_LARGE')
  if (options.types?.length && !options.types.includes(file.type)) {
    throw new UploadError(415, `不支持的文件类型: ${file.type || 'unknown'}`, 'UPLOAD_TYPE')
  }
  const dir = resolve(options.dir)
  mkdirSync(dir, { recursive: true })
  const ext = extname(file.name).toLowerCase() || '.bin'
  const name = `${randomUUID()}${ext}`
  const path = join(dir, name)
  writeFileSync(path, Buffer.from(await file.arrayBuffer()))
  return { path, name, size: file.size, type: file.type }
}
