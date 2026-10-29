// SPDX-License-Identifier: UNLICENSED
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
const ROOT = resolve(import.meta.dirname, '..')
const apps = ['sleep', 'meal', 'move', 'read', 'home', 'wear', 'hydrate', 'journal', 'watch', 'listen', 'learn', 'travel', 'ledger']
const children = apps.map(id => spawn(process.execPath, ['server.ts'], { cwd: resolve(ROOT, 'apps', id), stdio: 'inherit' }))
const stop = () => { for (const c of children) c.kill('SIGTERM'); process.exit(0) }
process.on('SIGINT', stop); process.on('SIGTERM', stop)
console.log('Life dev: ledger :4206 · sleep :4201 · meal :4202 · move :4203 · read :4204 · home :4205 · wear :4207 · hydrate :4208 · journal :4209 · watch :4210 · listen :4211 · learn :4212 · travel :4213')
