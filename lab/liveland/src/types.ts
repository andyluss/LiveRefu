export interface Constraint {
  id: string
  label: string
  statement: string
}

export interface EraStyle {
  colors: string[]
  materials: string[]
  light: string
}

export interface Era {
  id: string
  name: string
  subtitle: string
  from: string
  to: string
  tech: string
  maintenance: string
  cost: string
  summary: string
  style: EraStyle
}

export interface Entity {
  id: string
  name: string
  type: 'place' | 'person' | 'org' | 'tech' | 'event' | 'object' | string
  era: string
  summary: string
}

export interface CanonFact {
  id: string
  era: string
  statement: string
  confidence: 'canon' | 'draft' | 'rumor' | string
  sources: string[]
  dependsOn: string[]
  conflictsWith: string[]
  owner: string
}

export interface Asset {
  id: string
  title: string
  era: string
  type: string
  source: string
  license: string
  status: string
  path: string
}

export interface Output {
  id: string
  name: string
  type: string
  era: string
  status: string
  note: string
}

export interface World {
  id: string
  title: string
  subtitle: string
  premise: string
  owner: string
  version: string
  constraints: Constraint[]
  eras: Era[]
  entities: Entity[]
  canon: CanonFact[]
  assets: Asset[]
  outputs: Output[]
}

export type Severity = 'error' | 'warn' | 'info'
export interface Issue {
  code: string
  severity: Severity
  message: string
  path?: string
  detail?: string
}
export interface LintResult {
  issues: Issue[]
  errors: number
  warnings: number
  infos: number
  score: number
}
