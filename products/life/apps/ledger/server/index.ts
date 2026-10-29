// SPDX-License-Identifier: UNLICENSED
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { createStore } from './store.ts'
import { THEMES } from '../../../packages/theme/themes.ts'
import {
  accountBalance, budgetUsage, categoryBreakdown, invoiceTotals, invoiceOutstanding,
  isOverdue, monthOf, monthSummary, netWorth, nextInvoiceNumber, now, today, uid,
  type Account, type AccountType, type Budget, type Client, type Invoice, type InvoiceItem, type Settings, type Store, type Transaction, type TxType
} from './domain.ts'

const HOST = process.env.HOST || '127.0.0.1'
const PORT = Number(process.env.PORT || 4206)
const DATA_FILE = process.env.DATA_FILE || resolve('data/store.json')
const WEB = resolve('web')
const SHARED = resolve(import.meta.dirname, '../../../packages/web')
const store = createStore(DATA_FILE)
const MAX_BODY = 1_000_000

type Req = IncomingMessage & { body?: unknown }
type Res = ServerResponse

function send(res: Res, status: number, data: unknown): void {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}
function fail(res: Res, status: number, message: string): void {
  send(res, status, { error: message })
}
function body(req: Req): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) { reject(new Error('请求体过大')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { reject(new Error('JSON 解析失败')) }
    })
    req.on('error', reject)
  })
}
const str = (v: unknown): string => typeof v === 'string' ? v.trim() : ''
const cents = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : 0
}
const date = (v: unknown): string => /^\d{4}-\d{2}-\d{2}$/.test(str(v)) ? str(v) : ''
const month = (v: unknown): string => /^\d{4}-\d{2}$/.test(str(v)) ? str(v) : ''
const id = (): string => uid('id')
const accountById = (s: Store, x: string): Account | undefined => s.accounts.find(a => a.id === x)
const categoryById = (s: Store, x: string): boolean => s.categories.some(c => c.id === x)
function pack(s: Store): boolean { return !!s.settings.packs.freelance }

function csvCell(value: unknown): string {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
function csv(state: Store): string {
  const rows = [['date', 'type', 'amount', 'account', 'category', 'note', 'tags']]
  for (const tx of state.transactions) {
    rows.push([
      tx.date, tx.type, (tx.amount / 100).toFixed(2),
      state.accounts.find(a => a.id === tx.accountId)?.name || tx.accountId,
      state.categories.find(c => c.id === tx.categoryId)?.name || '',
      tx.note, tx.tags.join('|')
    ])
  }
  return rows.map(r => r.map(csvCell).join(',')).join('\n') + '\n'
}

export function createHandler(handle = store) {
  return async (req: Req, res: Res): Promise<void> => {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`)
    const path = url.pathname
    try {
      if (path === '/api/health') return send(res, 200, { ok: true, version: '1.3.0' })
      if (path === '/api/state' && req.method === 'GET') return send(res, 200, handle.read())
      if (path === '/api/backup' && req.method === 'GET') {
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'content-disposition': `attachment; filename="manmanji-${today()}.json"`,
          'cache-control': 'no-store'
        })
        return void res.end(JSON.stringify(handle.read(), null, 2))
      }
      if (path === '/api/export.csv' && req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="manmanji-${today()}.csv"` })
        return void res.end('\ufeff' + csv(handle.read()))
      }

      if (path === '/api/reset' && req.method === 'POST') {
        const state = handle.reset(true)
        return send(res, 200, state)
      }

      if (path === '/api/settings' && req.method === 'PATCH') {
        const input = await body(req)
        const state = handle.read()
        if (typeof input.theme === 'string' && THEMES.some(t => t.id === input.theme)) state.settings.theme = input.theme
        if (input.currency !== undefined && input.currency !== 'CNY') return fail(res, 400, 'v1.0 只支持 CNY')
        if (input.packs && typeof input.packs === 'object') {
          const packs = input.packs as Record<string, unknown>
          if (typeof packs.freelance === 'boolean') state.settings.packs.freelance = packs.freelance
        }
        return send(res, 200, handle.write(state))
      }

      if (path === '/api/accounts' && req.method === 'POST') {
        const input = await body(req)
        const name = str(input.name)
        const type = str(input.type) as AccountType
        if (!name) return fail(res, 400, '账户名不能为空')
        if (!['cash', 'bank', 'credit'].includes(type)) return fail(res, 400, '账户类型不合法')
        const opening = Number.isInteger(input.opening) ? Number(input.opening) : 0
        if (!Number.isInteger(opening)) return fail(res, 400, '期初余额必须是整数分')
        const state = handle.read()
        state.accounts.push({ id: id(), name, type, opening, color: str(input.color) || '#4F6D7A', createdAt: now() })
        return send(res, 201, handle.write(state))
      }

      const accountMatch = path.match(/^\/api\/accounts\/([^/]+)$/)
      if (accountMatch && req.method === 'DELETE') {
        const state = handle.read()
        const accountId = decodeURIComponent(accountMatch[1]!)
        if (state.transactions.some(t => t.accountId === accountId || t.toAccountId === accountId)) return fail(res, 409, '账户仍被流水引用，不能删除')
        if (state.invoices.some(i => i.depositAccountId === accountId)) return fail(res, 409, '账户仍被发票引用，不能删除')
        state.accounts = state.accounts.filter(a => a.id !== accountId)
        return send(res, 200, handle.write(state))
      }

      if (path === '/api/transactions' && req.method === 'POST') {
        const input = await body(req)
        const type = str(input.type) as TxType
        const amount = cents(input.amount)
        const accountId = str(input.accountId)
        const txDate = date(input.date)
        if (!['income', 'expense', 'transfer'].includes(type)) return fail(res, 400, '流水类型不合法')
        if (!amount) return fail(res, 400, '金额必须大于 0（单位：分）')
        if (!txDate) return fail(res, 400, '日期格式必须是 YYYY-MM-DD')
        const state = handle.read()
        if (!accountById(state, accountId)) return fail(res, 400, '账户不存在')
        let toAccountId: string | undefined
        let categoryId: string | undefined
        if (type === 'transfer') {
          toAccountId = str(input.toAccountId)
          if (!toAccountId || toAccountId === accountId) return fail(res, 400, '转账目标账户不能为空且不能与转出账户相同')
          if (!accountById(state, toAccountId)) return fail(res, 400, '目标账户不存在')
        } else {
          categoryId = str(input.categoryId)
          if (!categoryId || !categoryById(state, categoryId)) return fail(res, 400, '分类不存在')
        }
        const tx: Transaction = { id: id(), date: txDate, type, amount, accountId, toAccountId, categoryId, note: str(input.note), tags: Array.isArray(input.tags) ? input.tags.map(str).filter(Boolean).slice(0, 8) : [], createdAt: now() }
        state.transactions.push(tx)
        return send(res, 201, handle.write(state))
      }

      const txMatch = path.match(/^\/api\/transactions\/([^/]+)$/)
      if (txMatch && req.method === 'DELETE') {
        const state = handle.read()
        state.transactions = state.transactions.filter(t => t.id !== decodeURIComponent(txMatch[1]!))
        return send(res, 200, handle.write(state))
      }

      if (path === '/api/budgets' && req.method === 'POST') {
        const input = await body(req)
        const m = month(input.month), categoryId = str(input.categoryId), amount = Number(input.amount)
        if (!m) return fail(res, 400, '月份格式必须是 YYYY-MM')
        if (!categoryById(handle.read(), categoryId)) return fail(res, 400, '分类不存在')
        if (!Number.isInteger(amount) || amount < 0) return fail(res, 400, '预算必须是整数分')
        const state = handle.read()
        const existing = state.budgets.find(b => b.month === m && b.categoryId === categoryId)
        if (existing) existing.amount = amount
        else state.budgets.push({ id: id(), month: m, categoryId, amount } as Budget)
        return send(res, 200, handle.write(state))
      }
      const budgetMatch = path.match(/^\/api\/budgets\/([^/]+)$/)
      if (budgetMatch && req.method === 'DELETE') {
        const state = handle.read()
        state.budgets = state.budgets.filter(b => b.id !== decodeURIComponent(budgetMatch[1]!))
        return send(res, 200, handle.write(state))
      }

      if (path.startsWith('/api/clients') || path.startsWith('/api/invoices')) {
        if (!pack(handle.read())) return fail(res, 403, '发票扩展包未开启')
      }

      if (path === '/api/clients' && req.method === 'POST') {
        const input = await body(req)
        const name = str(input.name)
        if (!name) return fail(res, 400, '客户名不能为空')
        const state = handle.read()
        const client: Client = { id: id(), name, company: str(input.company), email: str(input.email), note: str(input.note), createdAt: now() }
        state.clients.push(client)
        return send(res, 201, handle.write(state))
      }
      const clientMatch = path.match(/^\/api\/clients\/([^/]+)$/)
      if (clientMatch && req.method === 'DELETE') {
        const state = handle.read()
        const cid = decodeURIComponent(clientMatch[1]!)
        if (state.invoices.some(i => i.clientId === cid)) return fail(res, 409, '客户仍被发票引用，不能删除')
        state.clients = state.clients.filter(c => c.id !== cid)
        return send(res, 200, handle.write(state))
      }

      if (path === '/api/invoices' && req.method === 'POST') {
        const input = await body(req)
        const state = handle.read()
        const clientId = str(input.clientId)
        if (!state.clients.some(c => c.id === clientId)) return fail(res, 400, '客户不存在')
        const depositAccountId = str(input.depositAccountId) || state.accounts.find(a => a.type === 'bank')?.id || ''
        if (!accountById(state, depositAccountId)) return fail(res, 400, '收款账户不存在')
        const itemsInput = Array.isArray(input.items) ? input.items : []
        const items: InvoiceItem[] = itemsInput.map((raw: unknown) => {
          const item = raw as Record<string, unknown>
          return { description: str(item.description) || '服务', qty: Math.max(0, Number(item.qty) || 0), unitPrice: Math.max(0, Math.round(Number(item.unitPrice) || 0)) }
        }).filter(i => i.qty > 0)
        if (!items.length) return fail(res, 400, '至少需要一个行项目')
        const taxRate = Math.max(0, Math.min(0.5, Number(input.taxRate) || 0))
        const issueDate = date(input.issueDate) || today()
        const dueDate = date(input.dueDate) || issueDate
        const inv: Invoice = {
          id: id(), number: nextInvoiceNumber(state.invoices, issueDate), clientId, issueDate, dueDate,
          status: 'draft', items, taxRate, note: str(input.note), depositAccountId, createdAt: now()
        }
        state.invoices.push(inv)
        return send(res, 201, handle.write(state))
      }

      const invoiceAction = path.match(/^\/api\/invoices\/([^/]+)\/(send|void|pay|delete)$/)
      if (invoiceAction && req.method === 'POST') {
        const state = handle.read()
        const inv = state.invoices.find(i => i.id === decodeURIComponent(invoiceAction[1]!))
        if (!inv) return fail(res, 404, '发票不存在')
        const action = invoiceAction[2]
        if (action === 'delete') {
          if (inv.status !== 'draft') return fail(res, 409, '只能删除草稿发票')
          state.invoices = state.invoices.filter(i => i.id !== inv.id)
          return send(res, 200, handle.write(state))
        }
        if (action === 'void') {
          if (inv.status === 'paid') return fail(res, 409, '已收款发票不能作废')
          inv.status = 'void'
          return send(res, 200, handle.write(state))
        }
        if (action === 'send') {
          if (inv.status !== 'draft') return fail(res, 409, '只有草稿可以发送')
          inv.status = 'sent'
          return send(res, 200, handle.write(state))
        }
        if (inv.status === 'paid') return send(res, 200, state)
        if (inv.status !== 'sent' && inv.status !== 'draft') return fail(res, 409, '当前状态不能收款')
        let category = state.categories.find(c => c.id === 'cat_freelance')
        if (!category) {
          category = { id: 'cat_freelance', name: '自由职业收入', kind: 'income', color: '#2F6B3A' }
          state.categories.push(category)
        }
        const totals = invoiceTotals(inv)
        const tx: Transaction = {
          id: id(), date: today(), type: 'income', amount: totals.total, accountId: inv.depositAccountId,
          categoryId: category.id, note: `发票 ${inv.number}`, tags: ['发票'], createdAt: now()
        }
        state.transactions.push(tx)
        inv.status = 'paid'
        inv.paidAt = now()
        inv.transactionId = tx.id
        return send(res, 200, handle.write(state))
      }

      if (path.startsWith('/api/')) return fail(res, 404, 'API 不存在')

      // static
      const rel = path === '/' ? 'index.html' : decodeURIComponent(path.slice(1))
      const isShared = path.startsWith('/shared/')
      const root = isShared ? SHARED : WEB
      const file = normalize(join(root, isShared ? rel.slice('shared/'.length) : rel))
      if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return fail(res, 404, '文件不存在')
      const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' })
      res.end(readFileSync(file))
    } catch (e) {
      const message = e instanceof Error ? e.message : '服务错误'
      if (!res.headersSent) fail(res, 500, message)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const handler = createHandler(store)
  createServer(handler).listen(PORT, HOST, () => {
    console.log(`Manmanji 1.3.0 · http://${HOST}:${PORT}`)
    console.log(`data: ${DATA_FILE}`)
  })
}
