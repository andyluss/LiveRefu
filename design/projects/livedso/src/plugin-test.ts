// SPDX-License-Identifier: Apache-2.0
import { loadRegistry } from './registry.ts'
import { loadVault } from './vault.ts'
import { runPlugins, type LocalPlugin } from './plugins.ts'
import type { Issue } from './types.ts'

export interface PluginTestVault {
  id: string
  name: string
  path: string
  plugins: string[]
  issues: Issue[]
  error?: string
}
export interface PluginTestMatrix {
  vaults: PluginTestVault[]
  loadErrors: Issue[]
  registryErrors: string[]
}

export function pluginTestAll(registryFile: string, plugins: LocalPlugin[], loadErrors: Issue[] = []): PluginTestMatrix {
  const registry = loadRegistry(registryFile, new URL('../vaults/lrds-sample', import.meta.url).pathname)
  const vaults: PluginTestVault[] = []
  for (const entry of registry.vaults) {
    try {
      const vault = loadVault(entry.path)
      vaults.push({ id: entry.id, name: entry.name, path: entry.path, plugins: plugins.map(p => p.name), issues: runPlugins(plugins, vault) })
    } catch (e) {
      vaults.push({ id: entry.id, name: entry.name, path: entry.path, plugins: plugins.map(p => p.name), issues: [], error: (e as Error).message })
    }
  }
  return { vaults, loadErrors, registryErrors: registry.errors }
}
