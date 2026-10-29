// SPDX-License-Identifier: UNLICENSED
import { now, today, type Store } from './domain.ts'

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
function monthDate(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, '0')}`
}

export function emptyState(): Store {
  return {
    version: 1,
    settings: { currency: 'CNY', theme: 'paper', packs: { freelance: true } },
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    recurring: [],
    clients: [],
    invoices: []
  }
}

export function seedState(): Store {
  const created = now()
  const month = today().slice(0, 7)
  const accounts = [
    { id: 'acc_cash', name: '现金', type: 'cash' as const, opening: 120000, color: '#B7791F', createdAt: created },
    { id: 'acc_bank', name: '日常银行卡', type: 'bank' as const, opening: 2800000, color: '#0F6B63', createdAt: created },
    { id: 'acc_credit', name: '信用卡', type: 'credit' as const, opening: 0, color: '#B42318', createdAt: created }
  ]
  const categories = [
    { id: 'cat_salary', name: '工资', kind: 'income' as const, color: '#0F6B63' },
    { id: 'cat_freelance', name: '自由职业收入', kind: 'income' as const, color: '#2F6B3A' },
    { id: 'cat_other_income', name: '其它收入', kind: 'income' as const, color: '#4F6D7A' },
    { id: 'cat_food', name: '餐饮', kind: 'expense' as const, color: '#B7791F' },
    { id: 'cat_housing', name: '居住', kind: 'expense' as const, color: '#8A4B2A' },
    { id: 'cat_transport', name: '交通', kind: 'expense' as const, color: '#4F6D7A' },
    { id: 'cat_tools', name: '工具/软件', kind: 'expense' as const, color: '#6B4F8A' },
    { id: 'cat_health', name: '健康', kind: 'expense' as const, color: '#B42318' },
    { id: 'cat_fun', name: '娱乐', kind: 'expense' as const, color: '#B7791F' },
    { id: 'cat_tax', name: '税费', kind: 'expense' as const, color: '#5E6773' },
    { id: 'cat_other', name: '其它支出', kind: 'expense' as const, color: '#9AA7B8' }
  ]
  const transactions = [
    { id: 'tx_salary', date: monthDate(month, 5), type: 'income' as const, amount: 1200000, accountId: 'acc_bank', categoryId: 'cat_salary', note: '本月工资', tags: ['固定'], createdAt: created },
    { id: 'tx_rent', date: monthDate(month, 3), type: 'expense' as const, amount: 350000, accountId: 'acc_bank', categoryId: 'cat_housing', note: '房租', tags: ['固定'], createdAt: created },
    { id: 'tx_food', date: monthDate(month, 6), type: 'expense' as const, amount: 8600, accountId: 'acc_cash', categoryId: 'cat_food', note: '午餐', tags: [], createdAt: created },
    { id: 'tx_tools', date: monthDate(month, 8), type: 'expense' as const, amount: 12900, accountId: 'acc_credit', categoryId: 'cat_tools', note: '字体授权', tags: ['工作'], createdAt: created },
    { id: 'tx_transfer', date: monthDate(month, 9), type: 'transfer' as const, amount: 50000, accountId: 'acc_bank', toAccountId: 'acc_cash', note: '取现', tags: [], createdAt: created },
    { id: 'tx_prev_salary', date: monthDate(month, 5), type: 'income' as const, amount: 1200000, accountId: 'acc_bank', categoryId: 'cat_salary', note: '上月工资', tags: ['固定'], createdAt: created }
  ]
  // 上个月的工资放在上个月，避免本月重复
  const prev = new Date(`${month}-01T00:00:00`); prev.setMonth(prev.getMonth() - 1)
  transactions[5]!.date = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-05`

  const client = { id: 'cli_orange', name: '橙港工作室', company: '橙港工作室', email: 'hello@example.com', note: '长期合作', createdAt: created }
  const invoice = {
    id: 'inv_sample',
    number: `INV-${today().slice(0, 4)}-001`,
    clientId: client.id,
    issueDate: today(),
    dueDate: addDays(today(), 10),
    status: 'sent' as const,
    items: [{ description: '品牌视觉设计', qty: 1, unitPrice: 150000 }],
    taxRate: 0.06,
    note: '请于到期日前付款',
    depositAccountId: 'acc_bank',
    createdAt: created
  }
  const draft = {
    id: 'inv_draft',
    number: '',
    clientId: client.id,
    issueDate: today(),
    dueDate: addDays(today(), 14),
    status: 'draft' as const,
    items: [{ description: '月度维护', qty: 1, unitPrice: 60000 }],
    taxRate: 0.06,
    note: '',
    depositAccountId: 'acc_bank',
    createdAt: created
  }
  return {
    ...emptyState(),
    accounts,
    categories,
    transactions,
    budgets: [
      { id: 'bud_food', month, categoryId: 'cat_food', amount: 80000 },
      { id: 'bud_housing', month, categoryId: 'cat_housing', amount: 350000 },
      { id: 'bud_tools', month, categoryId: 'cat_tools', amount: 50000 }
    ],
    clients: [client],
    invoices: [invoice, draft]
  }
}
