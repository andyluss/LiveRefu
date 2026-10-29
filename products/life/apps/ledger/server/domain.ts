// SPDX-License-Identifier: UNLICENSED
export type Cents = number
export type AccountType = 'cash' | 'bank' | 'credit'
export type TxType = 'income' | 'expense' | 'transfer'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void'

export interface Account { id: string; name: string; type: AccountType; opening: Cents; color: string; createdAt: string }
export interface Category { id: string; name: string; kind: 'income' | 'expense'; color: string }
export interface Transaction { id: string; date: string; type: TxType; amount: Cents; accountId: string; toAccountId?: string; categoryId?: string; note: string; tags: string[]; createdAt: string }
export interface Budget { id: string; month: string; categoryId: string; amount: Cents }
export interface Client { id: string; name: string; company: string; email: string; note: string; createdAt: string }
export interface InvoiceItem { description: string; qty: number; unitPrice: Cents }
export interface Invoice { id: string; number: string; clientId: string; issueDate: string; dueDate: string; status: InvoiceStatus; items: InvoiceItem[]; taxRate: number; note: string; depositAccountId: string; paidAt?: string; transactionId?: string; createdAt: string }
export interface Recurring { id: string; type: TxType; amount: Cents; accountId: string; categoryId?: string; note: string; frequency: 'monthly'; day: number; nextDate: string; active: boolean }
export interface Settings { currency: 'CNY'; theme: string; packs: { freelance: boolean } }
export interface Store {
  version: 1
  settings: Settings
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  budgets: Budget[]
  recurring: Recurring[]
  clients: Client[]
  invoices: Invoice[]
}

export const uid = (prefix: string): string => `${prefix}_${crypto.randomUUID().slice(0, 8)}`
export const cents = (value: number): Cents => Math.round(value)
export const money = (value: Cents): string => (value / 100).toFixed(2)
export const monthOf = (date: string): string => date.slice(0, 7)
export const today = (): string => new Date().toISOString().slice(0, 10)
export const now = (): string => new Date().toISOString()

export function parseAmount(input: string | number): Cents | null {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : null
  const cleaned = String(input).replace(/[,\s¥￥]/g, '')
  if (!/^-?\d+(\.\d{0,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}

export function accountBalance(account: Account, txs: Transaction[]): Cents {
  let balance = account.opening
  for (const tx of txs) {
    if (tx.type === 'income' && tx.accountId === account.id) balance += tx.amount
    if (tx.type === 'expense' && tx.accountId === account.id) balance -= tx.amount
    if (tx.type === 'transfer') {
      if (tx.accountId === account.id) balance -= tx.amount
      if (tx.toAccountId === account.id) balance += tx.amount
    }
  }
  return balance
}

export function netWorth(accounts: Account[], txs: Transaction[]): Cents {
  return accounts.reduce((sum, a) => sum + accountBalance(a, txs), 0)
}

export function monthSummary(txs: Transaction[], month: string): { income: Cents; expense: Cents; net: Cents } {
  let income = 0, expense = 0
  for (const tx of txs) {
    if (monthOf(tx.date) !== month) continue
    if (tx.type === 'income') income += tx.amount
    if (tx.type === 'expense') expense += tx.amount
  }
  return { income, expense, net: income - expense }
}

export function categoryBreakdown(txs: Transaction[], categories: Category[], month: string, kind: 'income' | 'expense' = 'expense'): Array<{ category: Category; amount: Cents; share: number }> {
  const total = txs.filter(t => t.type === kind && monthOf(t.date) === month).reduce((s, t) => s + t.amount, 0)
  const map = new Map<string, Cents>()
  for (const tx of txs) {
    if (tx.type !== kind || monthOf(tx.date) !== month || !tx.categoryId) continue
    map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount)
  }
  return [...map.entries()].map(([id, amount]) => {
    const category = categories.find(c => c.id === id) || { id, name: '未分类', kind, color: '#999' }
    return { category, amount, share: total ? amount / total : 0 }
  }).sort((a, b) => b.amount - a.amount)
}

export function budgetUsage(budgets: Budget[], txs: Transaction[], month: string): Array<{ budget: Budget; spent: Cents; ratio: number }> {
  return budgets.filter(b => b.month === month).map(budget => {
    const spent = txs.filter(t => t.type === 'expense' && t.categoryId === budget.categoryId && monthOf(t.date) === month).reduce((s, t) => s + t.amount, 0)
    return { budget, spent, ratio: budget.amount ? spent / budget.amount : 0 }
  }).sort((a, b) => b.ratio - a.ratio)
}

export function invoiceSubtotal(items: InvoiceItem[]): Cents {
  return items.reduce((sum, item) => sum + Math.round(item.qty * item.unitPrice), 0)
}
export function invoiceTotals(invoice: Pick<Invoice, 'items' | 'taxRate'>): { subtotal: Cents; tax: Cents; total: Cents } {
  const subtotal = invoiceSubtotal(invoice.items)
  const tax = Math.round(subtotal * invoice.taxRate)
  return { subtotal, tax, total: subtotal + tax }
}
export function invoiceOutstanding(invoice: Invoice): Cents {
  return invoice.status === 'sent' ? invoiceTotals(invoice).total : 0
}
export function isOverdue(invoice: Invoice, on = today()): boolean {
  return invoice.status === 'sent' && invoice.dueDate < on
}

export function nextInvoiceNumber(invoices: Invoice[], date = today()): string {
  const year = date.slice(0, 4)
  const prefix = `INV-${year}-`
  const used = invoices.filter(i => i.number.startsWith(prefix)).map(i => Number(i.number.slice(prefix.length)) || 0)
  return `${prefix}${String(Math.max(0, ...used) + 1).padStart(3, '0')}`
}

export function monthLabels(month: string, count = 6): string[] {
  const [y, m] = month.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(y!, m! - 1 - (count - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

export function validateStoreReferences(state: Store): string[] {
  const errors: string[] = []
  const accounts = new Set(state.accounts.map(a => a.id))
  const categories = new Set(state.categories.map(c => c.id))
  for (const tx of state.transactions) {
    if (!accounts.has(tx.accountId)) errors.push(`流水 ${tx.id} 的账户不存在`)
    if (tx.type === 'transfer' && (!tx.toAccountId || !accounts.has(tx.toAccountId))) errors.push(`转账 ${tx.id} 的目标账户不存在`)
    if (tx.type !== 'transfer' && tx.categoryId && !categories.has(tx.categoryId)) errors.push(`流水 ${tx.id} 的分类不存在`)
  }
  for (const invoice of state.invoices) {
    if (!state.clients.some(c => c.id === invoice.clientId)) errors.push(`发票 ${invoice.id} 的客户不存在`)
    if (invoice.depositAccountId && !accounts.has(invoice.depositAccountId)) errors.push(`发票 ${invoice.id} 的收款账户不存在`)
  }
  return errors
}
