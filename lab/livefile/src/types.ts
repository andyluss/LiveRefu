export interface ItemMeta {
  title?: string
  type?: string
  created?: string
  source?: string
  license?: string
  collections?: string[]
  tags?: string[]
  retention?: string
  person?: string
  note?: string
  public?: boolean
}
export interface ArchiveItem {
  id: string
  path: string
  title: string
  type: string
  created: string
  source: string
  license: string
  collections: string[]
  tags: string[]
  retention: string
  person: string
  isPublic: boolean
  size: number
  sha256: string
  mtime: string
  hasMeta: boolean
  preview: string
}
export interface BackupStatus {
  lastBackup?: string
  locations?: string[]
  verified?: boolean
  lastRestoreTest?: string
  note?: string
}
export interface Inheritance {
  custodian?: string
  backupCustodian?: string
  access?: string
  condition?: string
  keyCustodian?: string
  lastReviewed?: string
  note?: string
}
export interface ArchiveIndex {
  root: string
  items: ArchiveItem[]
  collections: Array<{ name: string; count: number }>
  timeline: Array<{ year: string; items: ArchiveItem[] }>
  backup: BackupStatus
  inheritance: Inheritance
  errors: string[]
}
export type Severity = 'error' | 'warn' | 'info'
export interface Issue {
  code: string
  severity: Severity
  message: string
  path?: string
}
export interface HealthResult {
  issues: Issue[]
  errors: number
  warnings: number
  infos: number
  score: number
}
