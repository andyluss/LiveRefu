// SPDX-License-Identifier: Apache-2.0
import { existsSync, readdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Issue, IssueSeverity, Vault } from './types.ts'

export interface PluginContext { vault: Vault; version: string }
export interface LocalPlugin {
  name: string
  file: string
  check: (context: PluginContext) => Issue[] | void
}
export interface PluginLoadResult { plugins: LocalPlugin[]; errors: Issue[] }

const SEVERITIES = new Set<IssueSeverity>(['error', 'warn', 'info'])

function normalizeIssue(raw: unknown, pluginName: string): Issue {
  if (!raw || typeof raw !== 'object') throw new Error(`${pluginName} 返回了非对象 issue`)
  const x = raw as Record<string, unknown>
  if (typeof x.code !== 'string' || !x.code) throw new Error(`${pluginName} 的 issue 缺少 code`)
  if (typeof x.message !== 'string' || !x.message) throw new Error(`${pluginName} 的 issue 缺少 message`)
  const severity = SEVERITIES.has(x.severity as IssueSeverity) ? x.severity as IssueSeverity : 'warn'
  return { code: x.code, severity, message: x.message, path: typeof x.path === 'string' ? x.path : undefined, detail: typeof x.detail === 'string' ? x.detail : undefined }
}

export async function loadPlugins(dir: string): Promise<PluginLoadResult> {
  const abs = resolve(dir)
  const plugins: LocalPlugin[] = []
  const errors: Issue[] = []
  if (!existsSync(abs)) return { plugins, errors }
  const files = readdirSync(abs).filter(n => n.endsWith('.mjs') || n.endsWith('.js')).sort()
  for (const name of files) {
    const file = join(abs, name)
    try {
      const mod = await import(pathToFileURL(file).href)
      const def = mod.default
      const object = def && typeof def === 'object' ? def as { name?: unknown; check?: unknown } : null
      const fn = typeof def === 'function' ? def as (context: PluginContext) => Issue[] | void : typeof object?.check === 'function' ? object.check as (context: PluginContext) => Issue[] | void : null
      if (!fn) throw new Error('默认导出必须是函数，或带 check() 的对象')
      plugins.push({ name: typeof object?.name === 'string' ? object.name : basename(name, name.endsWith('.mjs') ? '.mjs' : '.js'), file, check: fn })
    } catch (e) {
      errors.push({ code: 'plugin.load', severity: 'error', path: name, message: `插件加载失败：${(e as Error).message}` })
    }
  }
  return { plugins, errors }
}

export function runPlugins(plugins: LocalPlugin[], vault: Vault): Issue[] {
  const issues: Issue[] = []
  for (const plugin of plugins) {
    try {
      const result = plugin.check({ vault, version: '0.15' })
      for (const issue of result || []) issues.push(normalizeIssue(issue, plugin.name))
    } catch (e) {
      issues.push({ code: 'plugin.runtime', severity: 'error', path: plugin.name, message: `插件运行失败：${(e as Error).message}` })
    }
  }
  return issues
}
