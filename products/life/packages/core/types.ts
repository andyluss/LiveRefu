// SPDX-License-Identifier: UNLICENSED
export type FieldType = 'date' | 'time' | 'text' | 'textarea' | 'number' | 'select' | 'rating'
export interface Field {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  min?: number
  max?: number
  step?: number
  placeholder?: string
  default?: string | number
  help?: string
}
export interface LifeEntry {
  id: string
  date: string
  createdAt: string
  updatedAt: string
  data: Record<string, string | number>
}
export interface Summary {
  metrics: Array<{ label: string; value: string; note?: string }>
  chart: { label: string; values: number[] }
  streak?: number
  hint?: string
}
export interface CollectionConfig {
  id: string
  name: string
  entryLabel: string
  fields: Field[]
  columns: string[]
  seed?: Array<{ date: string; data: Record<string, string | number> }>
  summary(entries: LifeEntry[]): Summary
}
export interface PackConfig {
  id: string
  name: string
  description: string
  modules: CollectionConfig[]
}
export interface AppConfig {
  id: string
  name: string
  english: string
  tagline: string
  description: string
  accent: string
  accentOn: string
  port: number
  entryLabel: string
  fields: Field[]
  columns: string[]
  seed?: Array<{ date: string; data: Record<string, string | number> }>
  summary(entries: LifeEntry[]): Summary
  packs?: PackConfig[]
}
export type PublicModule = Omit<CollectionConfig, 'summary' | 'seed'>
export interface PublicPack { id: string; name: string; description: string; modules: PublicModule[] }
export type PublicConfig = Omit<AppConfig, 'summary' | 'seed' | 'packs'> & { packs: PublicPack[] }
export interface ModuleState { entries: LifeEntry[]; summary: Summary }
export interface StateResponse {
  config: PublicConfig
  settings: { packs: Record<string, boolean> }
  entries: LifeEntry[]
  summary: Summary
  modules: Record<string, ModuleState>
}
