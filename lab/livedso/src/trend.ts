// SPDX-License-Identifier: Apache-2.0
import { loadRegistry } from './registry.ts'
import { loadVault } from './vault.ts'
import { trendSnapshots, type SnapshotMetrics } from './history.ts'

export interface VaultTrend {
  id: string
  name: string
  path: string
  points: Array<SnapshotMetrics & { id: string; createdAt: string }>
  error?: string
}
export interface AllTrends {
  vaults: VaultTrend[]
  errors: string[]
}

export function allTrends(registryFile: string): AllTrends {
  const registry = loadRegistry(registryFile, new URL('../vault', import.meta.url).pathname)
  const errors = [...registry.errors]
  const vaults: VaultTrend[] = []
  for (const entry of registry.vaults) {
    try {
      const vault = loadVault(entry.path)
      vaults.push({ id: entry.id, name: entry.name, path: entry.path, points: trendSnapshots(vault) })
    } catch (e) {
      const message = (e as Error).message
      errors.push(`${entry.id}: ${message}`)
      vaults.push({ id: entry.id, name: entry.name, path: entry.path, points: [], error: message })
    }
  }
  return { vaults, errors }
}
