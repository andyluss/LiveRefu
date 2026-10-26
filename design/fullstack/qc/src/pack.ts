import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const root = fileURLToPath(new URL('..', import.meta.url))

export async function pack(): Promise<string> {
  const dist = join(root, 'dist')
  const index = join(root, 'src/index.ts')
  const cli = join(root, 'src/cli.ts')
  if (!existsSync(index) || !existsSync(cli)) {
    throw new Error('qc pack 需要在框架源码目录执行（找不到 src/index.ts）')
  }
  rmSync(dist, { recursive: true, force: true })
  await esbuild.build({
    entryPoints: [index],
    outfile: join(dist, 'index.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node24',
    external: ['node:*'],
    logLevel: 'silent',
  })
  await esbuild.build({
    entryPoints: [cli],
    outfile: join(dist, 'cli.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node24',
    external: ['node:*', 'esbuild'],
    logLevel: 'silent',
  })
  return dist
}
