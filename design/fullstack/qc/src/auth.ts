import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { html, type SafeHtml } from './html.ts'
import { HttpError } from './http.ts'
import { nowIso } from './time.ts'
import type { Db } from './data.ts'
import type { MailConfig, Mailer } from './mail.ts'

export interface AuthConfig {
  roles: string[]
  passwordMin: number
  sessionDays: number
  secureCookie: boolean
  mail?: MailConfig
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
      created_at text not null
    );
    create table if not exists qc_sessions (
      id text primary key,
      user_id integer,
      csrf text not null,
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

export function createAuth(db: Db, config: AuthConfig, mailer: Mailer): Auth {
  ensureTables(db)
  const days = Math.max(1, config.sessionDays)
  const maxAge = days * 24 * 60 * 60

  function userById(id: number): AuthUser | null {
    const row = db.one<UserRow>('select id, email, role from qc_users where id = ?', [id])
    return row ? { id: row.id, email: row.email, role: row.role } : null
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
    const row = db.one<UserRow>('select id, email, password_hash, role from qc_users where email = ?', [normalized])
    if (!row || !verifyPassword(password, row.password_hash)) {
      throw new HttpError(401, '邮箱或密码错误', 'INVALID_CREDENTIALS')
    }
    const fresh = newSession(row.id)
    return { user: { id: row.id, email: row.email, role: row.role }, cookie: fresh.cookie }
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
    return { user: { id, email: normalized, role: 'user' }, cookie: fresh.cookie }
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

  return { config, load, login, register, logout, verifyCsrf, csrfField, requestPasswordReset, resetPassword }
}
