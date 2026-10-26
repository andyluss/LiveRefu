import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

export interface Storage {
  put: (key: string, data: Buffer, type: string) => Promise<string>
}

export class LocalStorage implements Storage {
  dir: string
  constructor(dir: string) {
    this.dir = resolve(dir)
  }
  async put(key: string, data: Buffer): Promise<string> {
    const path = join(this.dir, key)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, data)
    return path
  }
}

export class MemoryStorage implements Storage {
  files = new Map<string, Buffer>()
  async put(key: string, data: Buffer): Promise<string> {
    this.files.set(key, data)
    return key
  }
}
