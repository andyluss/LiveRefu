// SPDX-License-Identifier: Apache-2.0
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
export interface JsonObject { [key: string]: JsonValue }

export interface TokenRecord {
  path: string
  tier: string
  type: string
  rawValue: JsonValue
  resolvedValue: JsonValue | null
  alias: string | null
  sourceFile: string
  description?: string
  deprecated?: boolean
  replacedBy?: string
  deprecationNote?: string
}

export interface ContrastPair {
  fg: string
  bg: string
  min: number
  label?: string
}

export interface ChecksConfig {
  contrast?: ContrastPair[]
  focusToken?: string
  actionToken?: string
  rawValueTiers?: string[]
  contractRequired?: string[]
}

export interface Contract {
  id: string
  title: string
  status?: string
  summary?: string
  anatomy?: string[]
  states?: string[]
  tokens?: string[]
  keyboard?: string
  a11y?: string
  do?: string[]
  dont?: string[]
  [key: string]: unknown
}

export interface StyleCard {
  id: string
  name: string
  era?: string
  note?: string
  colors?: string[]
  [key: string]: unknown
}

export interface Vault {
  root: string
  meta: { name?: string; version?: string; note?: string }
  tokens: Map<string, TokenRecord>
  tokenFiles: string[]
  contracts: Contract[]
  styleCards: StyleCard[]
  checks: ChecksConfig
  errors: string[]
}

export type IssueSeverity = 'error' | 'warn' | 'info'
export interface Issue {
  code: string
  severity: IssueSeverity
  message: string
  path?: string
  detail?: string
}

export interface CheckResult {
  issues: Issue[]
  errors: number
  warnings: number
  infos: number
  score: number
}
