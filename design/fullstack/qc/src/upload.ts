import { randomUUID } from 'node:crypto'
import { LocalStorage, type Storage } from './storage.ts'
import { extname } from 'node:path'
import { HttpError } from './http.ts'

export interface UploadOptions {
  dir: string
  maxBytes?: number
  types?: string[]
  storage?: Storage
  scan?: (data: Buffer, meta: { name: string; type: string; size: number }) => Promise<void>
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
  const ext = extname(file.name).toLowerCase() || '.bin'
  const name = `${randomUUID()}${ext}`
  const data = Buffer.from(await file.arrayBuffer())
  if (options.scan) await options.scan(data, { name: file.name, type: file.type, size: file.size })
  const storage = options.storage ?? new LocalStorage(options.dir)
  const path = await storage.put(name, data, file.type)
  return { path, name, size: file.size, type: file.type }
}
