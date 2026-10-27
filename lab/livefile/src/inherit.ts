import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import type { ArchiveIndex } from './types.ts'
import { publicHtml } from './public.ts'

export interface InheritancePackage {
  ok: boolean
  out: string
  files: number
  manifest: string
  errors: string[]
}

function inside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith('..' + sep))
}

export function buildInheritancePackage(index: ArchiveIndex, outDir: string): InheritancePackage {
  const out = resolve(outDir)
  const archive = resolve(index.root)
  if (inside(archive, out)) throw new Error('继承包不能放在 archive 内部')
  const errors: string[] = []
  mkdirSync(out, { recursive: true })
  try {
    cpSync(archive, join(out, 'archive'), { recursive: true, filter: src => !src.split(sep).includes('.git') && !src.split(sep).includes('backups') })
  } catch (e) { errors.push((e as Error).message) }
  const manifestPath = join(out, 'inheritance-package.json')
  const manifest = {
    generated: new Date().toISOString(),
    archive: archive,
    custodian: index.inheritance.custodian || '',
    backupCustodian: index.inheritance.backupCustodian || '',
    access: index.inheritance.access || '',
    condition: index.inheritance.condition || '',
    keyCustodian: index.inheritance.keyCustodian || '',
    items: index.items.map(i => ({ path: i.path, title: i.title, sha256: i.sha256, size: i.size }))
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  writeFileSync(join(out, 'README.md'), `# 档案继承包\n\n> 生成：${manifest.generated}\n> 原档案：\`${archive}\`\n\n## 包含\n\n- \`archive/\`：原始文件 + sidecar；\n- \`inheritance-package.json\`：条目 hash、保管人、访问条件；\n- \`public.html\`：只包含 public 条目的公开页；\n- 本说明。\n\n## 接手步骤\n\n1. 先只读打开 \`public.html\` 确认哪些内容可公开；\n2. 用 \`inheritance-package.json\` 核对文件数与 hash；\n3. 将 \`archive/\` 复制到新的本地目录；\n4. 保留本包，不要只保留解压后的文件。\n\n> 这是技术包，不是法律遗嘱；继承/授权需要单独的法律文件。\n`, 'utf8')
  writeFileSync(join(out, 'public.html'), publicHtml(index), 'utf8')
  return { ok: errors.length === 0, out, files: index.items.length, manifest: manifestPath, errors }
}
