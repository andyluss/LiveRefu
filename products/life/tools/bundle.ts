// SPDX-License-Identifier: UNLICENSED
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
const ROOT = resolve(import.meta.dirname, '..')
const DIST = resolve(ROOT, 'dist')
const apps = ['sleep', 'meal', 'move', 'read', 'home', 'wear', 'hydrate', 'journal', 'watch', 'listen', 'ledger']
rmSync(DIST, { recursive: true, force: true })
for (const id of apps) {
  const out = join(DIST, id)
  mkdirSync(join(out, 'apps'), { recursive: true })
  cpSync(join(ROOT, 'apps', id), join(out, 'apps', id), { recursive: true, filter: src => !src.includes('/data/') })
  cpSync(join(ROOT, 'packages'), join(out, 'packages'), { recursive: true, filter: src => !src.includes('/data/') })
  writeFileSync(join(out, 'README.md'), `# Life · ${id}\n\n独立分发包。启动：\n\n\`\`\`bash\ncd apps/${id}\nnode server.ts\n\`\`\`\n`)
  writeFileSync(join(out, 'package.json'), JSON.stringify({ name: `life-${id}`, version: '1.0.0', private: true, type: 'module' }, null, 2) + '\n')
  console.log(`bundle → ${out}`)
}
