export type Authority = 'read' | 'propose' | 'implement'

export interface Intent {
  readonly id: string
  readonly oneLine: string
  readonly pillars: readonly string[]
  readonly nonGoals: readonly string[]
}

export interface Context {
  readonly intent: Intent
  readonly constraints: readonly string[]
  readonly evidence: readonly string[]
  readonly version: string
}

export interface Task {
  readonly id: string
  readonly goal: string
  readonly nonGoals: readonly string[]
  readonly acceptance: readonly string[]
  readonly authority: Authority
}

export interface Option {
  readonly id: string
  readonly title: string
  readonly tradeoff: string
  readonly risk: string
}

export type EffectKind = 'write' | 'commit' | 'publish' | 'spend' | 'playtest'

export interface Effect {
  readonly kind: EffectKind
  readonly description: string
}

export interface Proposal {
  readonly taskId: string
  readonly options: readonly Option[]
  readonly assumptions: readonly string[]
  readonly effects: readonly Effect[]
}

export type Decision = 'keep' | 'cut' | 'explore' | 'adopt'

export interface JournalEntry {
  readonly taskId: string
  readonly decision: Decision
  readonly rationale: string
  readonly at: string
  readonly proposalHash: string
  readonly effects: readonly Effect[]
}

export interface State {
  readonly intent: Intent
  readonly entries: readonly JournalEntry[]
}

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string }

export const ok = <T>(value: T): Result<T> => ({ ok: true, value })
export const err = <T>(reason: string): Result<T> => ({ ok: false, reason })
