import type { SafeHtml } from './html.ts'
import type { Db } from './data.ts'
import type { QcConfig } from './config.ts'
import type { Auth, AuthSession, AuthUser } from './auth.ts'
import type { Schema } from './validate.ts'

export interface Ctx {
  request: Request
  url: URL
  params: Record<string, string>
  db: Db
  config: QcConfig
  appRoot: string
  form?: FormData
  json?: unknown
  input?: unknown
  user?: AuthUser | null
  session?: AuthSession
  auth?: Auth
  csrf?: string
  setCookie?: (cookie: string) => void
  rateLimit?: (key: string, limit: number, windowMs: number) => void
}

export type PageResult = SafeHtml | string | Response | Record<string, unknown>
export type ActionResult = SafeHtml | string | Response | Record<string, unknown> | void

export interface Page {
  auth?: 'required' | 'optional'
  load?: (ctx: Ctx) => unknown | Promise<unknown>
  render: (data: any, ctx: Ctx) => PageResult | Promise<PageResult>
  title?: string | ((data: any, ctx: Ctx) => string)
}

export interface Action {
  auth?: 'required' | 'optional'
  input?: Schema<any>
  errorTitle?: string
  onError?: (ctx: Ctx, error: unknown) => ActionResult | Promise<ActionResult>
  handle: (ctx: Ctx) => ActionResult | Promise<ActionResult>
}

export function definePage(page: Page): Page {
  return page
}

export function defineAction(action: Action): Action {
  return action
}

export function defineTable(name: string, fields: Record<string, string>): { name: string; fields: Record<string, string> } {
  return { name, fields }
}
