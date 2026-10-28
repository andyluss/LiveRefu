import { THEMES } from './themes.generated.js'
// 慢慢记 · 无框架单页应用
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmt = (cents) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format((Number(cents) || 0) / 100)
const fmtShort = (cents) => {
  const n = Math.abs(Number(cents) || 0) / 100
  if (n >= 10000) return `¥${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}万`
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
}
const today = () => new Date().toISOString().slice(0, 10)
const thisMonth = () => today().slice(0, 7)
const monthLabel = (m) => { const [y, mm] = m.split('-'); return `${y} 年 ${Number(mm)} 月` }
const typeLabel = { income: '收入', expense: '支出', transfer: '转账' }
const statusLabel = { draft: '草稿', sent: '待收', paid: '已收', void: '作废' }
const MODE_KEY = 'lrds-theme'
const FAMILY_KEY = 'manmanji-family'
const initialMode = (() => { try { const m = localStorage.getItem(MODE_KEY); return ['system', 'light', 'dark'].includes(m) ? m : 'system' } catch { return 'system' } })()
const state = { data: null, view: 'dashboard', month: thisMonth(), ledgerType: 'all', query: '', invoiceFilter: 'all', mode: initialMode }

async function api(path, method = 'GET', body) {
  const res = await fetch(`/api${path}`, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败 ${res.status}`)
  return data
}
let toastTimer
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show')
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200)
}
function familyFor(value) {
  return THEMES.find(f => f.id === value) || THEMES.find(f => f.light === value || f.dark === value) || THEMES[0]
}
function effectiveMode() {
  return state.mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : state.mode
}
function applyTheme() {
  const family = familyFor(state.data?.settings?.theme || 'paper')
  const effective = effectiveMode()
  const root = document.documentElement
  root.dataset.theme = state.mode
  root.dataset.style = effective === 'dark' ? family.dark : family.light
  root.style.colorScheme = state.mode === 'system' ? 'light dark' : state.mode
  $$('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode))
}
function setMode(mode) {
  if (!['system', 'light', 'dark'].includes(mode)) return
  state.mode = mode
  try { localStorage.setItem(MODE_KEY, mode) } catch {}
  applyTheme()
  render()
}
async function setFamily(value) {
  const family = familyFor(value)
  try {
    state.data = await api('/settings', 'PATCH', { theme: family.id })
    try { localStorage.setItem(FAMILY_KEY, family.id) } catch {}
    applyTheme()
    render()
    toast('风格 · ' + family.name)
  } catch (err) { toast(err.message) }
}
async function load() {
  state.data = await api('/state')
  if (!location.hash) location.hash = '#/dashboard'
  applyTheme()
  route()
}

function accountBalance(account) {
  let b = account.opening
  for (const tx of state.data.transactions) {
    if (tx.type === 'income' && tx.accountId === account.id) b += tx.amount
    if (tx.type === 'expense' && tx.accountId === account.id) b -= tx.amount
    if (tx.type === 'transfer') {
      if (tx.accountId === account.id) b -= tx.amount
      if (tx.toAccountId === account.id) b += tx.amount
    }
  }
  return b
}
function netWorth() { return state.data.accounts.reduce((s, a) => s + accountBalance(a), 0) }
function monthTxs(month = state.month) { return state.data.transactions.filter(t => t.date.slice(0, 7) === month) }
function monthSummary(month = state.month) {
  let income = 0, expense = 0
  for (const tx of monthTxs(month)) {
    if (tx.type === 'income') income += tx.amount
    if (tx.type === 'expense') expense += tx.amount
  }
  return { income, expense, net: income - expense }
}
function accountName(id) { return state.data.accounts.find(a => a.id === id)?.name || '—' }
function categoryName(id) { return state.data.categories.find(c => c.id === id)?.name || '未分类' }
function categoryColor(id) { return state.data.categories.find(c => c.id === id)?.color || '#9AA7B8' }
function invoiceTotals(inv) {
  const subtotal = inv.items.reduce((s, i) => s + Math.round(i.qty * i.unitPrice), 0)
  const tax = Math.round(subtotal * inv.taxRate)
  return { subtotal, tax, total: subtotal + tax }
}
function invoiceOutstanding() {
  if (!state.data.settings.packs.freelance) return 0
  return state.data.invoices.filter(i => i.status === 'sent').reduce((s, i) => s + invoiceTotals(i).total, 0)
}
function invoiceOverdue() {
  return state.data.invoices.filter(i => i.status === 'sent' && i.dueDate < today()).length
}
function monthLabels(count = 6) {
  const [y, m] = state.month.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(y, m - 1 - (count - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

function pageHead(kicker, title, desc, actions = '') {
  return `<div class="page-head"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1>${desc ? `<p>${desc}</p>` : ''}</div><div class="page-actions">${actions}</div></div>`
}
function metric(label, value, note = '', cls = '') {
  return `<div class="metric ${cls}"><div class="label">${esc(label)}</div><b>${value}</b><small>${esc(note)}</small></div>`
}
function txRow(tx, actions = true) {
  const cls = tx.type === 'income' ? 'positive' : tx.type === 'expense' ? 'negative' : ''
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '→'
  return `<tr><td><span class="type-dot ${tx.type}"></span>${esc(tx.date)}</td><td>${esc(typeLabel[tx.type])}${tx.type === 'transfer' ? `<br><small class="faint">${esc(accountName(tx.accountId))} → ${esc(accountName(tx.toAccountId))}</small>` : ''}</td><td><span class="tag" style="border-color:${categoryColor(tx.categoryId)}55">${esc(tx.type === 'transfer' ? '账户转账' : categoryName(tx.categoryId))}</span></td><td>${esc(accountName(tx.accountId))}</td><td class="muted">${esc(tx.note || '—')}</td><td class="num ${cls}">${sign} ${fmt(tx.amount)}</td>${actions ? `<td class="right"><button class="btn btn-ghost btn-sm" data-delete-tx="${esc(tx.id)}">删除</button></td>` : ''}</tr>`
}
function empty(text = '还没有记录。') { return `<div class="empty">${esc(text)}</div>` }

function renderDashboard() {
  const s = monthSummary(), nw = netWorth(), budget = state.data.budgets.filter(b => b.month === state.month)
  const spent = budget.reduce((sum, b) => sum + state.data.transactions.filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.slice(0, 7) === state.month).reduce((a, t) => a + t.amount, 0), 0)
  const budgetTotal = budget.reduce((a, b) => a + b.amount, 0)
  const overdue = invoiceOverdue()
  const recent = [...state.data.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 8)
  const labels = monthLabels()
  const max = Math.max(1, ...labels.flatMap(m => { const x = monthSummary(m); return [x.income, x.expense] }))
  const chart = labels.map(m => {
    const x = monthSummary(m)
    return `<div class="bar-col"><div class="bar-stack" title="${m}"><i class="bar" style="height:${Math.max(2, x.income / max * 100)}%"></i><i class="bar expense" style="height:${Math.max(2, x.expense / max * 100)}%"></i></div><span class="bar-label">${m.slice(5)}</span></div>`
  }).join('')
  const budgetRows = budget.length ? budget.map(b => {
    const used = state.data.transactions.filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.slice(0, 7) === state.month).reduce((a, t) => a + t.amount, 0)
    const ratio = b.amount ? used / b.amount : 0
    return `<div class="budget-row"><div class="budget-head"><span>${esc(categoryName(b.categoryId))}</span><b>${fmt(used)} / ${fmt(b.amount)}</b></div><div class="progress"><i class="${ratio > 1 ? 'over' : ratio > .8 ? 'warn' : ''}" style="width:${Math.min(100, ratio * 100)}%"></i></div></div>`
  }).join('') : empty('还没有本月预算。')
  return `${pageHead('OVERVIEW · ' + monthLabel(state.month), '先记清楚，再花得明白。', '这是你的本地财务台。所有数字从流水实时计算，不写死余额。', `<button class="btn" data-action="open-tx">记一笔</button>`)}
  <div class="hero">
    <div class="balance"><small>NET WORTH · 净资产</small><b>${fmt(nw)}</b><p>${state.data.accounts.length} 个账户 · 本月结余 ${fmt(s.net)} · 预算已用 ${budgetTotal ? Math.round(spent / budgetTotal * 100) : 0}%</p></div>
    <div class="side"><div class="card"><div class="card-head"><small>THIS MONTH</small><span>${monthLabel(state.month)}</span></div><div class="summary-line"><span>收入</span><b class="positive">${fmt(s.income)}</b></div><div class="summary-line"><span>支出</span><b class="negative">${fmt(s.expense)}</b></div><div class="summary-line"><span>结余</span><b class="${s.net >= 0 ? 'positive' : 'negative'}">${fmt(s.net)}</b></div></div><div class="card"><div class="card-head"><small>INVOICES</small><span>${state.data.settings.packs.freelance ? '扩展包' : '未开启'}</span></div><div class="summary-line"><span>待收</span><b>${fmt(invoiceOutstanding())}</b></div><div class="summary-line"><span>逾期</span><b class="${overdue ? 'negative' : ''}">${overdue} 张</b></div></div></div>
  </div>
  <div class="grid grid-4">${metric('净资产', fmt(nw), '账户余额合计')}${metric('本月收入', fmt(s.income), '不含转账', 'success')}${metric('本月支出', fmt(s.expense), '不含转账', 'danger')}${metric('本月结余', fmt(s.net), s.net >= 0 ? '可支配' : '需要回看')}</div>
  <div class="grid grid-2" style="margin-top:12px"><div class="card"><div class="card-head"><div><small>CASHFLOW · 6 MONTHS</small><h2>收支脉络</h2></div><div class="legend"><span><i style="background:var(--mm-action)"></i>收入</span><span><i style="background:var(--mm-rust)"></i>支出</span></div></div><div class="bars">${chart}</div></div><div class="card"><div class="card-head"><div><small>BUDGETS</small><h2>预算进度</h2></div><a class="btn btn-sm" href="#/budgets">管理</a></div>${budgetRows}</div></div>
  <div class="card" style="margin-top:12px"><div class="card-head"><div><small>RECENT</small><h2>最近流水</h2></div><a class="btn btn-sm" href="#/ledger">全部流水</a></div><div class="table-wrap"><table><thead><tr><th>日期</th><th>类型</th><th>分类</th><th>账户</th><th>备注</th><th class="num">金额</th><th></th></tr></thead><tbody>${recent.length ? recent.map(t => txRow(t)).join('') : `<tr><td colspan="7">${empty('还没有流水，记第一笔。')}</td></tr>`}</tbody></table></div></div>`
}

function renderLedger() {
  const q = state.query.toLowerCase()
  const rows = state.data.transactions.filter(t => t.date.slice(0, 7) === state.month && (state.ledgerType === 'all' || t.type === state.ledgerType) && (!q || [t.note, ...(t.tags || []), categoryName(t.categoryId), accountName(t.accountId)].join(' ').toLowerCase().includes(q))).sort((a, b) => b.date.localeCompare(a.date))
  const total = rows.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0)
  return `${pageHead('LEDGER', '流水', '每一笔都能追到账户与分类；转账只改变账户余额。', `<button class="btn btn-primary" data-action="open-tx">＋ 记一笔</button>`)}
  <div class="toolbar"><input type="month" id="ledger-month" value="${state.month}"><select id="ledger-type"><option value="all"${state.ledgerType === 'all' ? ' selected' : ''}>全部类型</option><option value="income"${state.ledgerType === 'income' ? ' selected' : ''}>收入</option><option value="expense"${state.ledgerType === 'expense' ? ' selected' : ''}>支出</option><option value="transfer"${state.ledgerType === 'transfer' ? ' selected' : ''}>转账</option></select><input type="search" id="ledger-search" value="${esc(state.query)}" placeholder="搜索备注、标签、分类…"><span class="hint">${rows.length} 笔 · 净额 <b class="${total >= 0 ? 'positive' : 'negative'}">${fmt(total)}</b></span></div>
  <div class="table-wrap"><table><thead><tr><th>日期</th><th>类型</th><th>分类</th><th>账户</th><th>备注</th><th class="num">金额</th><th></th></tr></thead><tbody>${rows.length ? rows.map(t => txRow(t)).join('') : `<tr><td colspan="7">${empty('这个月还没有匹配的流水。')}</td></tr>`}</tbody></table></div>`
}

function renderAccounts() {
  const cards = state.data.accounts.map(a => `<div class="card"><div class="card-head"><div><small>${esc(a.type.toUpperCase())}</small><h2>${esc(a.name)}</h2></div><button class="btn btn-ghost btn-sm" data-delete-account="${esc(a.id)}">删除</button></div><div class="metric" style="border:0;padding:0;background:none"><b>${fmt(accountBalance(a))}</b><small>期初 ${fmt(a.opening)} · 当前余额</small></div><div class="progress" style="margin-top:12px"><i style="width:${Math.min(100, Math.max(2, Math.abs(accountBalance(a)) / Math.max(1, Math.abs(netWorth())) * 100))}%;background:${esc(a.color)}"></i></div></div>`).join('')
  return `${pageHead('ACCOUNTS', '账户', '账户余额 = 期初 + 收入 − 支出 + 转入 − 转出。', `<button class="btn btn-primary" data-action="open-account">＋ 新账户</button>`)}<div class="grid grid-3">${cards || empty('还没有账户。')}</div><div class="card" style="margin-top:12px"><div class="card-head"><div><small>TOTAL</small><h2>净资产</h2></div><b style="font:24px var(--mm-font-mono)">${fmt(netWorth())}</b></div><p class="hint">信用账户余额为负时，会自然抵扣净资产；v1.0 不自动生成还款计划。</p></div>`
}

function renderBudgets() {
  const rows = state.data.budgets.filter(b => b.month === state.month).map(b => {
    const used = state.data.transactions.filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.slice(0, 7) === state.month).reduce((a, t) => a + t.amount, 0)
    const ratio = b.amount ? used / b.amount : 0
    return `<div class="budget-row"><div class="budget-head"><span>${esc(categoryName(b.categoryId))} ${ratio > 1 ? '<span class="pill overdue">超支</span>' : ''}</span><b>${fmt(used)} / ${fmt(b.amount)}</b></div><div class="progress"><i class="${ratio > 1 ? 'over' : ratio > .8 ? 'warn' : ''}" style="width:${Math.min(100, ratio * 100)}%"></i></div><div class="hint">${ratio > 1 ? `超出 ${fmt(used - b.amount)}` : `剩余 ${fmt(b.amount - used)}`}</div></div>`
  }).join('')
  const expenseCats = state.data.categories.filter(c => c.kind === 'expense')
  return `${pageHead('BUDGETS · ' + monthLabel(state.month), '预算', '按支出分类设置上限；只统计本月实际支出。', `<button class="btn btn-primary" data-action="open-budget">＋ 设置预算</button>`)}<div class="toolbar"><input type="month" id="budget-month" value="${state.month}"><span class="hint">支出分类 ${expenseCats.length} 个 · 已设预算 ${state.data.budgets.filter(b => b.month === state.month).length} 个</span></div><div class="card">${rows || empty('这个月还没有预算。')}</div>`
}

function renderInvoices() {
  if (!state.data.settings.packs.freelance) {
    return `${pageHead('PACK · FREELANCE', '发票扩展包', '开票不是记账的默认动作；需要时再打开。数据不会因关闭而删除。')}<div class="gate"><h2>开启自由职业扩展包</h2><p>客户、发票、行项目、税率、收款入账。开启后，发票收款会生成一条真实收入流水。</p><button class="btn btn-primary" data-action="enable-pack">开启扩展包</button></div>`
  }
  const list = state.data.invoices.filter(i => state.invoiceFilter === 'all' || (state.invoiceFilter === 'overdue' ? i.status === 'sent' && i.dueDate < today() : i.status === state.invoiceFilter)).sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  const cards = list.map(inv => {
    const client = state.data.clients.find(c => c.id === inv.clientId)
    const totals = invoiceTotals(inv)
    const overdue = inv.status === 'sent' && inv.dueDate < today()
    const actions = inv.status === 'draft' ? `<button class="btn btn-sm btn-primary" data-invoice-action="send" data-id="${inv.id}">发送</button><button class="btn btn-sm btn-danger" data-invoice-action="delete" data-id="${inv.id}">删除</button>` : inv.status === 'sent' ? `<button class="btn btn-sm btn-primary" data-invoice-action="pay" data-id="${inv.id}">标记收款</button><button class="btn btn-sm" data-invoice-action="void" data-id="${inv.id}">作废</button>` : ''
    return `<div class="invoice"><div class="invoice-head"><div><b>${esc(inv.number || '草稿')}</b><small>${esc(client?.name || '未知客户')} · ${esc(inv.issueDate)} → ${esc(inv.dueDate)}</small></div><span class="pill ${overdue ? 'overdue' : inv.status}">${overdue ? '逾期' : statusLabel[inv.status]}</span></div><div class="invoice-amount">${fmt(totals.total)}</div><div class="hint">小计 ${fmt(totals.subtotal)} · 税 ${fmt(totals.tax)} · ${inv.items.length} 项</div><div class="invoice-actions">${actions}</div></div>`
  }).join('')
  const clients = state.data.clients.map(c => `<div class="list-row"><div><b>${esc(c.name)}</b><small>${esc(c.company || c.email || '独立客户')}</small></div><button class="btn btn-ghost btn-sm" data-delete-client="${c.id}">删除</button></div>`).join('')
  const outstanding = state.data.invoices.filter(i => i.status === 'sent').reduce((s, i) => s + invoiceTotals(i).total, 0)
  return `${pageHead('PACK · FREELANCE', '发票', '客户、发票、税、收款。发票收款会进入收入流水。', `<button class="btn" data-action="open-client">＋ 客户</button><button class="btn btn-primary" data-action="open-invoice">＋ 发票</button>`)}
  <div class="grid grid-4">${metric('待收', fmt(outstanding), 'sent 状态合计')}${metric('逾期', String(invoiceOverdue()), '到期日已过', invoiceOverdue() ? 'danger' : '')}${metric('客户', String(state.data.clients.length), '本地客户')}${metric('发票', String(state.data.invoices.length), '含草稿/作废')}</div>
  <div class="grid grid-2" style="margin-top:12px"><div><div class="toolbar"><select id="invoice-filter"><option value="all">全部发票</option><option value="sent">待收</option><option value="paid">已收</option><option value="draft">草稿</option><option value="overdue">逾期</option></select></div><div class="invoice-list">${cards || empty('还没有发票。')}</div></div><div class="card"><div class="card-head"><div><small>CLIENTS</small><h2>客户</h2></div></div><div class="list">${clients || empty('还没有客户。')}</div></div></div>`
}

function renderReports() {
  const labels = monthLabels(6), max = Math.max(1, ...labels.map(m => Math.max(monthSummary(m).income, monthSummary(m).expense)))
  const chart = labels.map(m => { const s = monthSummary(m); return `<div class="bar-col"><div class="bar-stack"><i class="bar" style="height:${Math.max(2, s.income / max * 100)}%"></i><i class="bar expense" style="height:${Math.max(2, s.expense / max * 100)}%"></i></div><span class="bar-label">${m.slice(5)}</span></div>` }).join('')
  const cats = new Map()
  for (const tx of state.data.transactions.filter(t => t.type === 'expense' && t.date.slice(0, 7) === state.month && t.categoryId)) cats.set(tx.categoryId, (cats.get(tx.categoryId) || 0) + tx.amount)
  const total = [...cats.values()].reduce((a, b) => a + b, 0)
  const rows = [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([id, amount]) => `<div class="budget-row"><div class="budget-head"><span>${esc(categoryName(id))}</span><b>${fmt(amount)} · ${total ? Math.round(amount / total * 100) : 0}%</b></div><div class="progress"><i style="width:${total ? amount / total * 100 : 0}%;background:${categoryColor(id)}"></i></div></div>`).join('')
  return `${pageHead('REPORTS', '报表', '近 6 个月收支与本月分类占比；导出是本地文件，不上传。', `<a class="btn" href="/api/export.csv">导出 CSV</a><a class="btn" href="/api/backup">备份 JSON</a>`)}
  <div class="grid grid-2"><div class="card"><div class="card-head"><div><small>CASHFLOW</small><h2>近 6 个月</h2></div><div class="legend"><span><i style="background:var(--mm-action)"></i>收入</span><span><i style="background:var(--mm-rust)"></i>支出</span></div></div><div class="bars">${chart}</div></div><div class="card"><div class="card-head"><div><small>SHARE</small><h2>本月支出分类</h2></div><span class="hint">${fmt(total)}</span></div>${rows || empty('本月还没有支出。')}</div></div>
  <div class="card" style="margin-top:12px"><div class="card-head"><div><small>MONTHLY</small><h2>月度明细</h2></div></div><div class="table-wrap"><table><thead><tr><th>月份</th><th class="num">收入</th><th class="num">支出</th><th class="num">结余</th></tr></thead><tbody>${labels.map(m => { const s = monthSummary(m); return `<tr><td>${m}</td><td class="num positive">${fmt(s.income)}</td><td class="num negative">${fmt(s.expense)}</td><td class="num">${fmt(s.net)}</td></tr>` }).join('')}</tbody></table></div></div>`
}

function renderSettings() {
  const packs = state.data.settings.packs
  return `${pageHead('SETTINGS', '设置', '本地数据、扩展包与主题。所有设置只写在本机。')}
  <div class="settings-grid"><div class="card"><div class="card-head"><div><small>APPEARANCE</small><h2>外观</h2></div></div><div class="field"><label>风格主题</label><select id="setting-theme">${THEMES.map(t => `<option value="${t.id}"${familyFor(state.data.settings.theme).id === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div><div class="field"><label>外观</label><div class="mode-switch" data-mode-control role="group" aria-label="外观"><button type="button" data-mode="system" class="${state.mode === 'system' ? 'active' : ''}">系统</button><button type="button" data-mode="light" class="${state.mode === 'light' ? 'active' : ''}">浅色</button><button type="button" data-mode="dark" class="${state.mode === 'dark' ? 'active' : ''}">深色</button></div></div><p class="hint">风格决定品牌皮肤；外观独立跟随系统或固定浅/深，写入 <code>lrds-theme</code>。</p></div>
  <div class="card"><div class="card-head"><div><small>PACKS</small><h2>扩展包</h2></div></div><label class="list-row"><div><b>自由职业发票</b><small>客户 / 发票 / 收款 / 逾期</small></div><input type="checkbox" id="pack-freelance" ${packs.freelance ? 'checked' : ''}></label><p class="hint">关闭后隐藏导航与接口，但数据保留。</p></div>
  <div class="card"><div class="card-head"><div><small>DATA</small><h2>数据</h2></div></div><div class="summary-line"><span>账户</span><b>${state.data.accounts.length}</b></div><div class="summary-line"><span>流水</span><b>${state.data.transactions.length}</b></div><div class="summary-line"><span>发票</span><b>${state.data.invoices.length}</b></div><div class="page-actions" style="margin-top:12px"><a class="btn" href="/api/backup">下载完整备份</a><button class="btn btn-danger" data-action="reset">重置示例数据</button></div></div>
  <div class="card"><div class="card-head"><div><small>ABOUT</small><h2>慢慢记 1.2</h2></div></div><p class="hint">本地优先 · 零依赖 · Node 24 + 无框架 Web。数据文件：<code>data/store.json</code>；写入前自动生成 <code>.bak</code>。没有云、没有账号、没有遥测。</p><p class="hint" style="margin-top:8px">设计语义映射 LRDS；产品皮肤在 <code>web/tokens.css</code>。</p></div></div>`
}

function render() {
  applyTheme()
  const view = state.view
  $$('#nav button').forEach(b => { b.classList.toggle('active', b.dataset.view === view); b.hidden = b.dataset.pack === 'freelance' && !state.data.settings.packs.freelance })
  const topTheme = $('#theme-select'); if (topTheme) { const family = familyFor(state.data.settings.theme); topTheme.innerHTML = THEMES.map(t => `<option value="${t.id}"${family.id === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('') }
  applyTheme()
  const app = $('#app')
  app.innerHTML = view === 'dashboard' ? renderDashboard() : view === 'ledger' ? renderLedger() : view === 'accounts' ? renderAccounts() : view === 'budgets' ? renderBudgets() : view === 'invoices' ? renderInvoices() : view === 'reports' ? renderReports() : renderSettings()
  bindView()
}
function route() {
  const v = (location.hash.replace(/^#\//, '') || 'dashboard').split('?')[0]
  state.view = ['dashboard', 'ledger', 'accounts', 'budgets', 'invoices', 'reports', 'settings'].includes(v) ? v : 'dashboard'
  if (state.view === 'invoices' && !state.data.settings.packs.freelance) state.view = 'dashboard'
  render()
}

function bindView() {
  const month = $('#ledger-month'); if (month) month.onchange = e => { state.month = e.target.value; render() }
  const bmonth = $('#budget-month'); if (bmonth) bmonth.onchange = e => { state.month = e.target.value; render() }
  const type = $('#ledger-type'); if (type) type.onchange = e => { state.ledgerType = e.target.value; render() }
  const search = $('#ledger-search'); if (search) search.oninput = e => { state.query = e.target.value; render(); const s = $('#ledger-search'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length) } }
  const inv = $('#invoice-filter'); if (inv) inv.onchange = e => { state.invoiceFilter = e.target.value; render() }
  const theme = $('#setting-theme'); if (theme) theme.onchange = e => setFamily(e.target.value)
  const topTheme = $('#theme-select'); if (topTheme) topTheme.onchange = e => setFamily(e.target.value)
  const pack = $('#pack-freelance'); if (pack) pack.onchange = async e => { try { state.data = await api('/settings', 'PATCH', { packs: { freelance: e.target.checked } }); if (!e.target.checked && state.view === 'invoices') location.hash = '#/dashboard'; render(); toast(e.target.checked ? '发票扩展包已开启' : '发票扩展包已关闭') } catch (err) { toast(err.message) } }
}

function modal({ title, kicker = 'NEW', body, submit = '保存', onSubmit }) {
  $('#modal-title').textContent = title
  $('#modal-kicker').textContent = kicker
  $('#modal-body').innerHTML = body
  $('#modal-submit').textContent = submit
  const dialog = $('#modal')
  const form = $('#modal-form')
  form.onsubmit = async e => {
    e.preventDefault()
    try { await onSubmit(); dialog.close(); await refresh() } catch (err) { toast(err.message) }
  }
  $$('[data-close]', dialog).forEach(b => b.onclick = () => dialog.close())
  if (!dialog.open) dialog.showModal()
}
async function refresh() { state.data = await api('/state'); render() }

async function openTx() {
  const cats = state.data.categories
  modal({
    title: '记一笔', kicker: 'LEDGER · NEW',
    body: `<div class="field-row"><div class="field"><label>类型</label><select id="tx-type"><option value="expense">支出</option><option value="income">收入</option><option value="transfer">转账</option></select></div><div class="field"><label>金额（元）</label><input id="tx-amount" inputmode="decimal" placeholder="0.00" required></div></div><div class="field-row"><div class="field"><label>日期</label><input id="tx-date" type="date" value="${today()}" required></div><div class="field"><label>账户</label><select id="tx-account">${state.data.accounts.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div></div><div class="field" id="tx-cat-wrap"><label>分类</label><select id="tx-category">${cats.map(c => `<option value="${c.id}">${c.kind === 'income' ? '收入' : '支出'} · ${esc(c.name)}</option>`).join('')}</select></div><div class="field" id="tx-to-wrap" hidden><label>转入账户</label><select id="tx-to">${state.data.accounts.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div><div class="field-row"><div class="field"><label>备注</label><input id="tx-note" placeholder="例如：午餐、房租、客户回款"></div><div class="field"><label>标签（逗号分隔）</label><input id="tx-tags" placeholder="工作, 固定"></div></div>`,
    onSubmit: async () => {
      const amount = Math.round(Number($('#tx-amount').value) * 100)
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('金额必须大于 0')
      const type = $('#tx-type').value
      const payload = { type, amount, date: $('#tx-date').value, accountId: $('#tx-account').value, note: $('#tx-note').value, tags: $('#tx-tags').value.split(',').map(s => s.trim()).filter(Boolean) }
      if (type === 'transfer') payload.toAccountId = $('#tx-to').value
      else payload.categoryId = $('#tx-category').value
      state.data = await api('/transactions', 'POST', payload)
      toast('已记一笔')
    }
  })
  const t = $('#tx-type'); t.onchange = () => { const tr = t.value === 'transfer'; $('#tx-cat-wrap').hidden = tr; $('#tx-to-wrap').hidden = !tr }
}
function openAccount() {
  modal({
    title: '新账户', kicker: 'ACCOUNT · NEW',
    body: `<div class="field"><label>名称</label><input id="acc-name" placeholder="例如：招商银行" required></div><div class="field-row"><div class="field"><label>类型</label><select id="acc-type"><option value="bank">银行卡</option><option value="cash">现金</option><option value="credit">信用卡</option></select></div><div class="field"><label>期初余额（元）</label><input id="acc-opening" inputmode="decimal" value="0"></div></div><div class="field"><label>展示色</label><input id="acc-color" type="color" value="#0F6B63"></div>`,
    onSubmit: async () => {
      const opening = Math.round(Number($('#acc-opening').value || 0) * 100)
      if (!Number.isInteger(opening)) throw new Error('期初余额不合法')
      state.data = await api('/accounts', 'POST', { name: $('#acc-name').value, type: $('#acc-type').value, opening, color: $('#acc-color').value })
      toast('账户已创建')
    }
  })
}
function openBudget() {
  const cats = state.data.categories.filter(c => c.kind === 'expense')
  modal({
    title: '设置预算', kicker: 'BUDGET · ' + state.month,
    body: `<div class="field"><label>月份</label><input id="bud-month" type="month" value="${state.month}" required></div><div class="field"><label>支出分类</label><select id="bud-cat">${cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label>预算金额（元）</label><input id="bud-amount" inputmode="decimal" placeholder="0.00" required></div>`,
    onSubmit: async () => {
      const amount = Math.round(Number($('#bud-amount').value) * 100)
      if (!Number.isInteger(amount) || amount < 0) throw new Error('预算不合法')
      state.data = await api('/budgets', 'POST', { month: $('#bud-month').value, categoryId: $('#bud-cat').value, amount })
      state.month = $('#bud-month').value
      toast('预算已保存')
    }
  })
}
function openClient() {
  modal({
    title: '新客户', kicker: 'CLIENT · NEW',
    body: `<div class="field"><label>名称</label><input id="cli-name" placeholder="客户/联系人" required></div><div class="field-row"><div class="field"><label>公司</label><input id="cli-company"></div><div class="field"><label>邮箱</label><input id="cli-email" type="email"></div></div><div class="field"><label>备注</label><textarea id="cli-note" rows="2"></textarea></div>`,
    onSubmit: async () => {
      state.data = await api('/clients', 'POST', { name: $('#cli-name').value, company: $('#cli-company').value, email: $('#cli-email').value, note: $('#cli-note').value })
      toast('客户已创建')
    }
  })
}
function invoiceItemRow() {
  return `<div class="invoice-item"><input class="item-desc" placeholder="服务描述"><input class="item-qty" type="number" min="0" step="1" value="1"><input class="item-price" type="number" min="0" step="0.01" placeholder="单价（元）"></div>`
}
function openInvoice() {
  if (!state.data.clients.length) { toast('先添加一个客户'); return openClient() }
  const clients = state.data.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')
  const accounts = state.data.accounts.map(a => `<option value="${a.id}"${a.type === 'bank' ? ' selected' : ''}>${esc(a.name)}</option>`).join('')
  modal({
    title: '新发票', kicker: 'INVOICE · NEW', submit: '创建草稿',
    body: `<div class="field-row"><div class="field"><label>客户</label><select id="inv-client">${clients}</select></div><div class="field"><label>税率</label><select id="inv-tax"><option value="0">0%</option><option value="0.03">3%</option><option value="0.06" selected>6%</option><option value="0.13">13%</option></select></div></div><div class="field-row"><div class="field"><label>开票日</label><input id="inv-issue" type="date" value="${today()}"></div><div class="field"><label>到期日</label><input id="inv-due" type="date" value="${today()}"></div></div><div class="field-row"><div class="field"><label>收款账户</label><select id="inv-account">${accounts}</select></div><div class="field"><label>备注</label><input id="inv-note" placeholder="付款说明"></div></div><div class="field"><label>行项目</label><div class="invoice-items" id="invoice-items">${invoiceItemRow()}</div><button type="button" class="btn btn-sm" id="add-item" style="margin-top:6px">＋ 行项目</button></div>`,
    onSubmit: async () => {
      const items = $$('.invoice-item').map(row => ({ description: $('.item-desc', row).value || '服务', qty: Number($('.item-qty', row).value || 0), unitPrice: Math.round(Number($('.item-price', row).value || 0) * 100) })).filter(i => i.qty > 0 && i.unitPrice >= 0)
      if (!items.length) throw new Error('至少一个有效行项目')
      state.data = await api('/invoices', 'POST', { clientId: $('#inv-client').value, issueDate: $('#inv-issue').value, dueDate: $('#inv-due').value, taxRate: Number($('#inv-tax').value), note: $('#inv-note').value, depositAccountId: $('#inv-account').value, items })
      toast('发票草稿已创建')
    }
  })
  $('#add-item').onclick = () => $('#invoice-items').insertAdjacentHTML('beforeend', invoiceItemRow())
}

async function action(name, el) {
  try {
    if (name === 'open-tx') return openTx()
    if (name === 'open-account') return openAccount()
    if (name === 'open-budget') return openBudget()
    if (name === 'open-client') return openClient()
    if (name === 'open-invoice') return openInvoice()
    if (name === 'enable-pack') { state.data = await api('/settings', 'PATCH', { packs: { freelance: true } }); render(); return toast('发票扩展包已开启') }
    if (name === 'reset') { if (!confirm('重置会替换当前数据为示例数据，确定？')) return; state.data = await api('/reset', 'POST'); render(); return toast('已重置') }
    const tx = el.dataset.deleteTx
    if (tx) { if (!confirm('删除这笔流水？')) return; state.data = await api(`/transactions/${encodeURIComponent(tx)}`, 'DELETE'); render(); return toast('已删除') }
    const acc = el.dataset.deleteAccount
    if (acc) { if (!confirm('删除这个账户？')) return; state.data = await api(`/accounts/${encodeURIComponent(acc)}`, 'DELETE'); render(); return toast('已删除') }
    const cli = el.dataset.deleteClient
    if (cli) { if (!confirm('删除这个客户？')) return; state.data = await api(`/clients/${encodeURIComponent(cli)}`, 'DELETE'); render(); return toast('已删除') }
    const inv = el.dataset.invoiceAction
    if (inv) {
      const id = el.dataset.id
      if (inv === 'pay' && !confirm('标记收款会生成一条收入流水，确定？')) return
      state.data = await api(`/invoices/${encodeURIComponent(id)}/${inv}`, 'POST')
      render(); return toast(inv === 'pay' ? '已收款并记入流水' : inv === 'send' ? '已标记待收' : inv === 'void' ? '已作废' : '已删除')
    }
  } catch (err) { toast(err.message) }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action], [data-delete-tx], [data-delete-account], [data-delete-client], [data-invoice-action]')
  if (!el) return
  const name = el.dataset.action || (el.dataset.deleteTx ? 'delete-tx' : el.dataset.deleteAccount ? 'delete-account' : el.dataset.deleteClient ? 'delete-client' : el.dataset.invoiceAction ? 'invoice' : '')
  if (name) action(name, el)
})
$('#nav').addEventListener('click', e => {
  const btn = e.target.closest('button[data-view]')
  if (!btn || btn.hidden) return
  const next = `#/${btn.dataset.view}`
  if (location.hash === next) route()
  else location.hash = next
})
$('#quick-add').onclick = () => openTx()
document.addEventListener('click', e => { const btn = e.target.closest('[data-mode]'); if (btn) setMode(btn.dataset.mode) })
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (state.mode === 'system') applyTheme() })
window.addEventListener('hashchange', () => { if (state.data) route() })
load().catch(err => { console.error(err); document.body.innerHTML = `<div class="empty">启动失败：${esc(err.message)}</div>` })
