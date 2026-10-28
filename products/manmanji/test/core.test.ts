// SPDX-License-Identifier: UNLICENSED
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  accountBalance, budgetUsage, invoiceTotals, monthSummary, netWorth, nextInvoiceNumber,
  parseAmount, today, type Transaction
} from '../server/domain.ts'
import { seedState as seed } from '../server/seed.ts'
import { createStore } from '../server/store.ts'
import { createHandler } from '../server/index.ts'

test('amount parsing keeps cents exact', () => {
  assert.equal(parseAmount('1,234.56'), 123456)
  assert.equal(parseAmount('¥0.10'), 10)
  assert.equal(parseAmount('12.345'), null)
})

test('account balances include transfer without changing net worth', () => {
  const state = seed()
  const cash = state.accounts.find(a => a.id === 'acc_cash')!
  const bank = state.accounts.find(a => a.id === 'acc_bank')!
  const before = netWorth(state.accounts, state.transactions)
  const transfer: Transaction = { id: 't', date: today(), type: 'transfer', amount: 10000, accountId: bank.id, toAccountId: cash.id, note: '', tags: [], createdAt: '' }
  const txs = [...state.transactions, transfer]
  assert.equal(accountBalance(bank, txs), accountBalance(bank, state.transactions) - 10000)
  assert.equal(accountBalance(cash, txs), accountBalance(cash, state.transactions) + 10000)
  assert.equal(netWorth(state.accounts, txs), before)
})

test('monthly summary and budget usage agree', () => {
  const state = seed()
  const s = monthSummary(state.transactions, today().slice(0, 7))
  assert.ok(s.income > 0)
  assert.ok(s.expense > 0)
  const usage = budgetUsage(state.budgets, state.transactions, today().slice(0, 7))
  assert.equal(usage.length, 3)
  assert.ok(usage.every(u => u.spent >= 0 && Number.isFinite(u.ratio)))
})

test('invoice totals and numbering', () => {
  const inv = { items: [{ description: 'design', qty: 2, unitPrice: 100000 }], taxRate: 0.06 }
  assert.deepEqual(invoiceTotals(inv), { subtotal: 200000, tax: 12000, total: 212000 })
  const state = seed()
  const next = nextInvoiceNumber(state.invoices, '2026-10-28')
  assert.match(next, /^INV-2026-\d{3}$/)
  assert.ok(Number(next.slice(-3)) > 1)
})

test('store writes atomically and keeps a backup', () => {
  const dir = mkdtempSync(join(tmpdir(), 'manmanji-store-'))
  const file = join(dir, 'store.json')
  try {
    const store = createStore(file)
    const first = store.write(seed())
    assert.equal(store.read().transactions.length, first.transactions.length)
    const second = store.write({ ...first, settings: { ...first.settings, theme: 'night' } })
    assert.equal(store.read().settings.theme, 'night')
    assert.ok(existsSync(`${file}.bak`))
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).settings.theme, 'night')
    assert.equal(second.version, 1)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('HTTP API handles state, ledger and invoice payment', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'manmanji-api-'))
  const file = join(dir, 'store.json')
  const store = createStore(file)
  store.write(seed())
  const server = createServer(createHandler(store))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
  const port = (server.address() as { port: number }).port
  const base = `http://127.0.0.1:${port}`
  try {
    const initial = await (await fetch(`${base}/api/state`)).json() as any
    assert.ok(initial.accounts.length >= 1)
    const account = await (await fetch(`${base}/api/accounts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '测试现金', type: 'cash', opening: 10000 }) })).json() as any
    assert.ok(account.accounts.some((a: any) => a.name === '测试现金'))
    const tx = await (await fetch(`${base}/api/transactions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'expense', amount: 1200, date: today(), accountId: account.accounts.at(-1).id, categoryId: 'cat_food', note: '测试' }) })).json() as any
    assert.ok(tx.transactions.some((t: any) => t.note === '测试'))
    const invoices = initial.invoices as any[]
    const sent = invoices.find(i => i.status === 'sent')
    assert.ok(sent)
    const paid = await (await fetch(`${base}/api/invoices/${sent.id}/pay`, { method: 'POST' })).json() as any
    const invoice = paid.invoices.find((i: any) => i.id === sent.id)
    assert.equal(invoice.status, 'paid')
    assert.ok(paid.transactions.some((t: any) => t.tags?.includes('发票')))
    const again = await (await fetch(`${base}/api/invoices/${sent.id}/pay`, { method: 'POST' })).json() as any
    assert.equal(again.transactions.filter((t: any) => t.tags?.includes('发票')).length, paid.transactions.filter((t: any) => t.tags?.includes('发票')).length)
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
    rmSync(dir, { recursive: true, force: true })
  }
})
