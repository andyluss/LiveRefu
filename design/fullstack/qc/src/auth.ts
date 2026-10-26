import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { html, type SafeHtml } from './html.ts'
import { HttpError } from './http.ts'
import { nowIso } from './time.ts'
import type { Db } from './data.ts'
import type { MailConfig, Mailer } from './mail.ts'

export interface OAuthProvider {
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  clientId: string
  clientSecret: string
  scope?: string
  pkce?: boolean
  refreshUrl?: string
}

export interface OAuthProfile {
  id?: string
  email: string
  name?: string
  emailVerified?: boolean
}

export interface AuthConfig {
  roles: string[]
  passwordMin: number
  sessionDays: number
  secureCookie: boolean
  mail?: MailConfig
  oauth?: Record<string, OAuthProvider>
}

export const defaultAuthConfig: AuthConfig = {
  roles: ['user'],
  passwordMin: 8,
  sessionDays: 30,
  secureCookie: false,
}

export interface AuthUser {
  id: number
  email: string
  role: string
  emailVerified: boolean
}

export interface AuthSession {
  id: string
  csrf: string
  userId: number | null
  expiresAt: string
}

interface UserRow {
  id: number
  email: string
  password_hash: string
  role: string
  email_verified: number
}

interface SessionRow {
  id: string
  user_id: number | null
  csrf: string
  expires_at: string
}

export interface Auth {
  config: AuthConfig
  load: (request: Request) => { user: AuthUser | null; session: AuthSession; cookie: string }
  login: (email: string, password: string) => { user: AuthUser; cookie: string }
  register: (email: string, password: string) => { user: AuthUser; cookie: string }
  logout: (session: AuthSession) => string
  verifyCsrf: (session: AuthSession, form: FormData | null, request: Request) => boolean
  csrfField: (session: AuthSession) => SafeHtml
  requestPasswordReset: (email: string, baseUrl: string) => Promise<void>
  resetPassword: (token: string, password: string) => void
  requestEmailVerification: (email: string, baseUrl: string) => Promise<void>
  verifyEmail: (token: string) => string
  oauthStart: (provider: string, redirectUri: string) => URL
  oauthCallback: (provider: string, code: string, state: string, redirectUri: string) => Promise<{ user: AuthUser; cookie: string }>
  oauthRefresh: (provider: string, userId: number) => Promise<string>
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [kind, salt, hash] = stored.split('$')
  if (kind !== 'scrypt' || !salt || !hash) return false
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function parseCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie') ?? ''
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

function serializeCookie(token: string, maxAgeSeconds: number, secure: boolean): string {
  return `qc_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`
}

function clearCookie(): string {
  return 'qc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
}

function ensureTables(db: Db): void {
  db.raw.exec(`
    create table if not exists qc_users (
      id integer primary key autoincrement,
      email text unique not null,
      password_hash text not null,
      role text not null default 'user',
      email_verified integer not null default 0,
      created_at text not null
    );
    create table if not exists qc_email_verifications (
      token_hash text primary key,
      user_id integer not null,
      expires_at text not null,
      used integer not null default 0,
      created_at text not null
    );
    create table if not exists qc_sessions (
      id text primary key,
      user_id integer,
      csrf text not null,
      expires_at text not null,
      created_at text not null
    );
    create table if not exists qc_oauth_tokens (
      provider text not null,
      user_id integer not null,
      refresh_token text not null,
      access_token text,
      expires_at text,
      updated_at text not null,
      primary key (provider, user_id)
    );
    create table if not exists qc_oauth_states (
      state text primary key,
      provider text not null,
      redirect_uri text not null,
      code_verifier text,
      expires_at text not null,
      created_at text not null
    );
    create table if not exists qc_password_resets (
      token_hash text primary key,
      user_id integer not null,
      expires_at text not null,
      used integer not null default 0,
      created_at text not null
    );
  `)
}

export function createAuth(db: Db, config: AuthConfig, mailer: Mailer, options: { fetch?: typeof fetch } = {}): Auth {
  ensureTables(db)
  const days = Math.max(1, config.sessionDays)
  const maxAge = days * 24 * 60 * 60

  function userById(id: number): AuthUser | null {
    const row = db.one<UserRow>('select id, email, role, email_verified from qc_users where id = ?', [id])
    return row ? { id: row.id, email: row.email, role: row.role, emailVerified: Boolean(row.email_verified) } : null
  }

  function newSession(userId: number | null): { session: AuthSession; token: string; cookie: string } {
    const token = randomToken()
    const csrf = randomToken(24)
    const expiresAt = nowIso(new Date(Date.now() + maxAge * 1000))
    db.run('insert into qc_sessions (id, user_id, csrf, expires_at, created_at) values (?, ?, ?, ?, ?)', [
      sha256(token), userId, csrf, expiresAt, nowIso(),
    ])
    return {
      session: { id: sha256(token), csrf, userId, expiresAt },
      token,
      cookie: serializeCookie(token, maxAge, config.secureCookie),
    }
  }

  function load(request: Request) {
    const token = parseCookie(request, 'qc_session')
    if (token) {
      const row = db.one<SessionRow>('select id, user_id, csrf, expires_at from qc_sessions where id = ? and expires_at > ?', [sha256(token), nowIso()])
      if (row) {
        return {
          session: { id: row.id, csrf: row.csrf, userId: row.user_id, expiresAt: row.expires_at },
          user: row.user_id ? userById(row.user_id) : null,
          cookie: '',
        }
      }
    }
    const fresh = newSession(null)
    return { session: fresh.session, user: null, cookie: fresh.cookie }
  }

  function login(email: string, password: string) {
    const normalized = email.trim().toLowerCase()
    const row = db.one<UserRow>('select id, email, password_hash, role, email_verified from qc_users where email = ?', [normalized])
    if (!row || !verifyPassword(password, row.password_hash)) {
      throw new HttpError(401, '邮箱或密码错误', 'INVALID_CREDENTIALS')
    }
    const fresh = newSession(row.id)
    return { user: { id: row.id, email: row.email, role: row.role, emailVerified: Boolean(row.email_verified) }, cookie: fresh.cookie }
  }

  function register(email: string, password: string) {
    const normalized = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new HttpError(400, '邮箱格式无效', 'INVALID_EMAIL')
    if (password.length < config.passwordMin) throw new HttpError(400, `密码至少 ${config.passwordMin} 位`, 'WEAK_PASSWORD')
    if (db.one('select id from qc_users where email = ?', [normalized])) {
      throw new HttpError(409, '邮箱已注册', 'EMAIL_TAKEN')
    }
    const id = db.insert('qc_users', {
      email: normalized,
      password_hash: hashPassword(password),
      role: config.roles.includes('user') ? 'user' : (config.roles[0] ?? 'user'),
      created_at: nowIso(),
    })
    const fresh = newSession(id)
    return { user: { id, email: normalized, role: 'user', emailVerified: false }, cookie: fresh.cookie }
  }

  function logout(session: AuthSession): string {
    db.run('delete from qc_sessions where id = ?', [session.id])
    return clearCookie()
  }

  function verifyCsrf(session: AuthSession, form: FormData | null, request: Request): boolean {
    const token = form?.get('_csrf') ?? request.headers.get('x-csrf-token')
    return typeof token === 'string' && token.length > 0 && token === session.csrf
  }

  function csrfField(session: AuthSession): SafeHtml {
    return html`<input type="hidden" name="_csrf" value="${session.csrf}">`
  }

  function oauthStart(provider: string, redirectUri: string): URL {
    const cfg = config.oauth?.[provider]
    if (!cfg) throw new HttpError(400, `未知 OAuth provider: ${provider}`, 'OAUTH_PROVIDER')
    const state = randomToken(24)
    const verifier = cfg.pkce ? randomToken(48) : ''
    db.run('insert into qc_oauth_states (state, provider, redirect_uri, code_verifier, expires_at, created_at) values (?, ?, ?, ?, ?, ?)', [
      state, provider, redirectUri, verifier || null, nowIso(new Date(Date.now() + 10 * 60 * 1000)), nowIso(),
    ])
    const url = new URL(cfg.authorizationUrl)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', cfg.clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('state', state)
    if (cfg.scope) url.searchParams.set('scope', cfg.scope)
    if (cfg.pkce) {
      url.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'))
      url.searchParams.set('code_challenge_method', 'S256')
    }
    return url
  }

  async function oauthCallback(provider: string, code: string, state: string, redirectUri: string): Promise<{ user: AuthUser; cookie: string }> {
    const cfg = config.oauth?.[provider]
    if (!cfg) throw new HttpError(400, `未知 OAuth provider: ${provider}`, 'OAUTH_PROVIDER')
    const row = db.one<{ provider: string; redirect_uri: string; code_verifier: string | null }>('select provider, redirect_uri, code_verifier from qc_oauth_states where state = ? and expires_at > ?', [state, nowIso()])
    if (!row || row.provider !== provider || row.redirect_uri !== redirectUri) {
      throw new HttpError(400, 'OAuth state 无效或已过期', 'OAUTH_STATE')
    }
    db.run('delete from qc_oauth_states where state = ?', [state])
    const fetchImpl = options.fetch ?? fetch
    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }
    if (cfg.pkce && row.code_verifier) tokenParams.code_verifier = row.code_verifier
    const tokenRes = await fetchImpl(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams(tokenParams),
    })
    if (!tokenRes.ok) throw new HttpError(502, 'OAuth token 交换失败', 'OAUTH_TOKEN')
    const token = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
    if (!token.access_token) throw new HttpError(502, 'OAuth 响应缺少 access_token', 'OAUTH_TOKEN')
    const profileRes = await fetchImpl(cfg.userInfoUrl, {
      headers: { authorization: `Bearer ${token.access_token}`, accept: 'application/json' },
    })
    if (!profileRes.ok) throw new HttpError(502, 'OAuth 用户信息获取失败', 'OAUTH_PROFILE')
    const profile = await profileRes.json() as Record<string, unknown>
    const email = String(profile.email ?? profile.mail ?? '').trim().toLowerCase()
    if (!email) throw new HttpError(502, 'OAuth 未返回邮箱', 'OAUTH_EMAIL')
    const verified = Boolean(profile.email_verified ?? profile.emailVerified ?? false)
    let user = db.one<UserRow>('select id, email, password_hash, role, email_verified from qc_users where email = ?', [email])
    if (!user) {
      const id = db.insert('qc_users', {
        email,
        password_hash: hashPassword(randomToken(32)),
        role: config.roles.includes('user') ? 'user' : (config.roles[0] ?? 'user'),
        email_verified: verified ? 1 : 0,
        created_at: nowIso(),
      })
      user = { id, email, password_hash: '', role: 'user', email_verified: verified ? 1 : 0 }
    } else if (verified && !user.email_verified) {
      db.run('update qc_users set email_verified = 1 where id = ?', [user.id])
      user.email_verified = 1
    }
    if (token.refresh_token) {
      db.run('insert into qc_oauth_tokens (provider, user_id, refresh_token, access_token, expires_at, updated_at) values (?, ?, ?, ?, ?, ?) on conflict(provider, user_id) do update set refresh_token = excluded.refresh_token, access_token = excluded.access_token, expires_at = excluded.expires_at, updated_at = excluded.updated_at', [
        provider, user.id, token.refresh_token, token.access_token, token.expires_in ? nowIso(new Date(Date.now() + token.expires_in * 1000)) : null, nowIso(),
      ])
    }
    const fresh = newSession(user.id)
    return {
      user: { id: user.id, email: user.email, role: user.role, emailVerified: Boolean(user.email_verified) },
      cookie: fresh.cookie,
    }
  }

  async function oauthRefresh(provider: string, userId: number): Promise<string> {
    const cfg = config.oauth?.[provider]
    if (!cfg) throw new HttpError(400, `未知 OAuth provider: ${provider}`, 'OAUTH_PROVIDER')
    const row = db.one<{ refresh_token: string }>('select refresh_token from qc_oauth_tokens where provider = ? and user_id = ?', [provider, userId])
    if (!row) throw new HttpError(400, '没有可用的 refresh token', 'OAUTH_REFRESH')
    const fetchImpl = options.fetch ?? fetch
    const response = await fetchImpl(cfg.refreshUrl ?? cfg.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: row.refresh_token,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      }),
    })
    if (!response.ok) throw new HttpError(502, 'OAuth refresh 失败', 'OAUTH_REFRESH')
    const token = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
    if (!token.access_token) throw new HttpError(502, 'OAuth refresh 缺少 access_token', 'OAUTH_REFRESH')
    db.run('update qc_oauth_tokens set access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ? where provider = ? and user_id = ?', [
      token.access_token,
      token.refresh_token ?? row.refresh_token,
      token.expires_in ? nowIso(new Date(Date.now() + token.expires_in * 1000)) : null,
      nowIso(), provider, userId,
    ])
    return token.access_token
  }

  async function requestEmailVerification(email: string, baseUrl: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const row = db.one<UserRow>('select id, email, password_hash, role, email_verified from qc_users where email = ?', [normalized])
    if (!row || row.email_verified) return
    const token = randomToken(32)
    const expiresAt = nowIso(new Date(Date.now() + 24 * 60 * 60 * 1000))
    db.run('insert into qc_email_verifications (token_hash, user_id, expires_at, used, created_at) values (?, ?, ?, 0, ?)', [
      sha256(token), row.id, expiresAt, nowIso(),
    ])
    const link = `${baseUrl.replace(/\/$/, '')}/verify?token=${encodeURIComponent(token)}`
    try {
      await mailer.send({
        to: row.email,
        subject: '验证你的青橙全栈邮箱',
        text: `打开以下链接验证邮箱（24 小时内有效）：\n${link}`,
      })
    } catch (error) {
      console.error('[qc] 验证邮件发送失败', error)
    }
  }

  function verifyEmail(token: string): string {
    const row = db.one<{ user_id: number }>('select user_id from qc_email_verifications where token_hash = ? and used = 0 and expires_at > ?', [
      sha256(token), nowIso(),
    ])
    if (!row) throw new HttpError(400, '验证链接无效或已过期', 'INVALID_VERIFY_TOKEN')
    const user = db.one<{ email: string }>('select email from qc_users where id = ?', [row.user_id])
    db.transaction(() => {
      db.run('update qc_users set email_verified = 1 where id = ?', [row.user_id])
      db.run('update qc_email_verifications set used = 1 where token_hash = ?', [sha256(token)])
    })
    return user?.email ?? ''
  }

  async function requestPasswordReset(email: string, baseUrl: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const row = db.one<UserRow>('select id, email, password_hash, role from qc_users where email = ?', [normalized])
    if (!row) return
    const token = randomToken(32)
    const expiresAt = nowIso(new Date(Date.now() + 30 * 60 * 1000))
    db.run('insert into qc_password_resets (token_hash, user_id, expires_at, used, created_at) values (?, ?, ?, 0, ?)', [
      sha256(token), row.id, expiresAt, nowIso(),
    ])
    const link = `${baseUrl.replace(/\/$/, '')}/reset?token=${encodeURIComponent(token)}`
    try {
      await mailer.send({
        to: row.email,
        subject: '重置你的青橙全栈密码',
        text: `打开以下链接重置密码（30 分钟内有效）：\n${link}\n\n如果不是你发起的，请忽略。`,
      })
    } catch (error) {
      console.error('[qc] 重置邮件发送失败', error)
    }
  }

  function resetPassword(token: string, password: string): void {
    if (password.length < config.passwordMin) throw new HttpError(400, `密码至少 ${config.passwordMin} 位`, 'WEAK_PASSWORD')
    const row = db.one<{ user_id: number }>('select user_id from qc_password_resets where token_hash = ? and used = 0 and expires_at > ?', [
      sha256(token), nowIso(),
    ])
    if (!row) throw new HttpError(400, '重置链接无效或已过期', 'INVALID_RESET_TOKEN')
    db.transaction(() => {
      db.run('update qc_users set password_hash = ? where id = ?', [hashPassword(password), row.user_id])
      db.run('update qc_password_resets set used = 1 where token_hash = ?', [sha256(token)])
      db.run('delete from qc_sessions where user_id = ?', [row.user_id])
    })
  }

  return { config, load, login, register, logout, verifyCsrf, csrfField, requestPasswordReset, resetPassword, requestEmailVerification, verifyEmail, oauthStart, oauthCallback, oauthRefresh }
}
