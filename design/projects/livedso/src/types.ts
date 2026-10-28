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

export interface StyleCardRoles {
  bg?: string; bgSubtle?: string;
  surface?: string; surfaceRaised?: string; surfaceSunken?: string; surfaceHover?: string;
  text?: string; textOnSurface?: string; textMuted?: string; textSubtle?: string; textInverse?: string;
  textLink?: string; textVisited?: string; textDisabled?: string;
  border?: string; borderStrong?: string; borderSubtle?: string; divider?: string;
  focus?: string;
  action?: string; actionHover?: string; actionPressed?: string; actionDisabled?: string;
  onAction?: string; secondaryAction?: string; onSecondaryAction?: string; ghostAction?: string;
  danger?: string; onDanger?: string; dangerSubtle?: string;
  success?: string; onSuccess?: string; successSubtle?: string;
  warning?: string; onWarning?: string; warningSubtle?: string;
  info?: string; onInfo?: string; infoSubtle?: string;
  accent?: string; accent2?: string; selection?: string;
  codeBg?: string; codeText?: string;
  chart1?: string; chart2?: string; chart3?: string; chart4?: string; chart5?: string; chart6?: string;
  [key: string]: string | undefined;
}

export interface StyleCard {
  id: string
  name: string
  era?: string
  note?: string
  colors?: string[]
  mode?: 'light' | 'dark'
  roles?: StyleCardRoles
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
  messageEn?: string
  path?: string
  detail?: string
  detailEn?: string
}

export interface CheckResult {
  issues: Issue[]
  errors: number
  warnings: number
  infos: number
  score: number
}
