import { initTheme, mountThemeControls } from '/shared/theme.js'
const $ = (s, r = document) => r.querySelector(s)
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const pad = n => String(n).padStart(2, '0')
const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const clone = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d, n) => { const x = clone(d); x.setDate(x.getDate() + n); return x }
const lastDay = (y, m) => new Date(y, m + 1, 0)
const PERIODS = [
  { id: '7d', label: '近七天' }, { id: '10d', label: '近十天' }, { id: '30d', label: '近三十天' },
  { id: 'week', label: '本周' }, { id: 'xun', label: '本旬' }, { id: 'month', label: '本月', core: true },
  { id: 'peng', label: '本朋（两月）' }, { id: 'season', label: '本季' }, { id: 'year', label: '本年' }
]
const SEASONS = [
  { name: '春', start: 2, end: 4 }, { name: '夏', start: 5, end: 7 },
  { name: '秋', start: 8, end: 10 }, { name: '冬', start: 11, end: 1 }
]
const state = { apps: [], states: {}, selected: new Set(), period: 'month' }
function rangeFor(id, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
  if (id === '7d' || id === '10d' || id === '30d') {
    const n = id === '7d' ? 7 : id === '10d' ? 10 : 30
    return { start: addDays(now, -(n - 1)), end: clone(now), name: PERIODS.find(p => p.id === id).label }
  }
  if (id === 'week') {
    const offset = (now.getDay() + 6) % 7
    return { start: addDays(now, -offset), end: addDays(now, 6 - offset), name: '本周（周一起）' }
  }
  if (id === 'xun') {
    const startDay = d <= 10 ? 1 : d <= 20 ? 11 : 21
    return { start: new Date(y, m, startDay), end: new Date(y, m, d <= 10 ? 10 : d <= 20 ? 20 : lastDay(y, m).getDate()), name: `本旬 · ${startDay}–${d <= 10 ? 10 : d <= 20 ? 20 : lastDay(y, m).getDate()} 日` }
  }
  if (id === 'month') return { start: new Date(y, m, 1), end: lastDay(y, m), name: '本月' }
  if (id === 'peng') {
    const pair = Math.floor(m / 2), startM = pair * 2, endM = startM + 1
    return { start: new Date(y, startM, 1), end: lastDay(y, endM), name: '本朋 · 两个月一期' }
  }
  if (id === 'season') {
    const season = m >= 2 && m <= 4 ? SEASONS[0] : m >= 5 && m <= 7 ? SEASONS[1] : m >= 8 && m <= 10 ? SEASONS[2] : SEASONS[3]
    if (season.name === '冬') {
      if (m === 11) return { start: new Date(y, 11, 1), end: lastDay(y + 1, 1), name: '本季 · 冬' }
      return { start: new Date(y - 1, 11, 1), end: lastDay(y, 1), name: '本季 · 冬' }
    }
    return { start: new Date(y, season.start, 1), end: lastDay(y, season.end), name: `本季 · ${season.name}` }
  }
  return { start: new Date(y, 0, 1), end: new Date(y, 11, 31), name: '本年' }
}
function datesOf(st) {
  if (!st) return []
  if (Array.isArray(st.entries)) return st.entries.map(e => e.date).filter(Boolean)
  if (Array.isArray(st.transactions)) return st.transactions.map(t => t.date).filter(Boolean)
  return []
}
function selectedDates() {
  return state.apps.filter(a => state.selected.has(a.id)).flatMap(a => datesOf(state.states[a.id]))
}
function countMap(dates) { const map = new Map(); for (const d of dates) map.set(d, (map.get(d) || 0) + 1); return map }
function bucketize(range, dates, period) {
  const counts = countMap(dates)
  const days = Math.round((range.end - range.start) / 86400000) + 1
  if (period === 'year' || days > 100) {
    const out = []
    let cur = new Date(range.start.getFullYear(), range.start.getMonth(), 1)
    while (cur <= range.end) {
      const end = lastDay(cur.getFullYear(), cur.getMonth())
      let count = 0
      for (const [d, n] of counts) if (d >= key(cur) && d <= key(end)) count += n
      out.push({ label: `${cur.getMonth() + 1}月`, count })
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }
    return out
  }
  const out = []
  let cur = clone(range.start)
  while (cur <= range.end) {
    out.push({ label: `${cur.getMonth() + 1}/${cur.getDate()}`, count: counts.get(key(cur)) || 0, date: key(cur) })
    cur = addDays(cur, 1)
  }
  return out
}
function renderPeriods() {
  $('#periods').innerHTML = PERIODS.map(p => `<button data-period="${p.id}" class="${state.period === p.id ? 'active' : ''} ${p.core ? 'core' : ''}" role="tab">${esc(p.label)}</button>`).join('')
  document.querySelectorAll('[data-period]').forEach(b => b.onclick = () => { state.period = b.dataset.period; render() })
}
function renderChips(range) {
  const dateSet = selectedDates()
  const counts = state.apps.map(app => ({ app, count: datesOf(state.states[app.id]).filter(d => d >= key(range.start) && d <= key(range.end)).length }))
  $('#app-chips').innerHTML = counts.map(({ app, count }) => `<button class="app-chip ${state.selected.has(app.id) ? 'on' : ''}" data-app="${esc(app.id)}"><i class="dot"></i><span>${esc(app.name)}</span><span class="count">${count}</span></button>`).join('')
  document.querySelectorAll('[data-app]').forEach(b => b.onclick = () => {
    const id = b.dataset.app
    if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id)
    render()
  })
  $('#selected-count').textContent = `${state.selected.size} / ${state.apps.length} 款应用 · ${dateSet.length} 条记录`
  $('#all-apps').textContent = state.selected.size === state.apps.length ? '全不选' : '全选'
  $('#all-apps').onclick = () => { state.selected = state.selected.size === state.apps.length ? new Set() : new Set(state.apps.map(a => a.id)); render() }
}
function renderStats(range, dates) {
  const uniqueDays = new Set(dates.filter(d => d >= key(range.start) && d <= key(range.end))).size
  const activeApps = state.apps.filter(a => state.selected.has(a.id) && datesOf(state.states[a.id]).some(d => d >= key(range.start) && d <= key(range.end))).length
  $('#rhythm-stats').innerHTML = `<div><b>${dates.length}</b>记录</div><div><b>${uniqueDays}</b>有记录的天</div><div><b>${activeApps}</b>款应用</div>`
}
function renderChart(range, period) {
  const dates = selectedDates().filter(d => d >= key(range.start) && d <= key(range.end))
  const buckets = bucketize(range, dates, period)
  const max = Math.max(1, ...buckets.map(b => b.count))
  const showEvery = buckets.length <= 14 ? 1 : Math.ceil(buckets.length / 8)
  $('#chart').style.setProperty('--bar-gap', buckets.length > 45 ? '2px' : '5px')
  $('#chart').style.setProperty('--bar-width', buckets.length > 45 ? '48%' : '58%')
  const weekLines = period !== 'week' && period !== 'year'
  const cols = buckets.map((b, i) => {
    const isWeekStart = weekLines && b.date && i > 0 && new Date(`${b.date}T00:00:00`).getDay() === 1
    return `<div class="rhythm-col ${isWeekStart ? 'week-start' : ''}" title="${esc(b.label)}：${b.count} 条"><div class="bar-space"><i style="height:${b.count ? Math.max(3, b.count / max * 100) : 0}%;opacity:${b.count ? '.82' : '.18'}"></i></div></div>`
  }).join('')
  const labels = buckets.map((b, i) => `<div class="rhythm-label">${i % showEvery === 0 || i === buckets.length - 1 ? `<span>${esc(b.label)}</span>` : ''}</div>`).join('')
  $('#chart').innerHTML = `<div class="rhythm-bars">${cols}</div><div class="rhythm-labels">${labels}</div>`
  $('#range-label').textContent = range.name
  $('#range-meta').textContent = `${key(range.start)} → ${key(range.end)} · ${buckets.length} 个刻度`
  $('#period-kicker').textContent = period === 'year' ? 'YEAR · MONTHLY' : period === 'season' ? 'SEASON · DAILY' : period === 'peng' ? 'PENG · DAILY' : 'PERIOD · DAILY'
  $('#period-title').textContent = range.name
  $('#empty').hidden = dates.length > 0
  $('#chart').hidden = dates.length === 0
  renderStats(range, dates)
  const top = state.apps.map(a => ({ a, n: datesOf(state.states[a.id]).filter(d => d >= key(range.start) && d <= key(range.end)).length })).filter(x => x.n > 0 && state.selected.has(x.a.id)).sort((x, y) => y.n - x.n).slice(0, 6)
  $('#breakdown').innerHTML = top.map(({ a, n }) => `<div class="card"><small>${esc(a.group)} · ${esc(a.english)}</small><b>${n}</b><small>${esc(a.name)} · 本周期记录</small></div>`).join('')
}
function render() {
  const range = rangeFor(state.period)
  renderPeriods()
  renderChips(range)
  renderChart(range, state.period)
}
async function load() {
  state.apps = await fetch('/api/apps').then(r => r.json())
  state.selected = new Set(state.apps.map(a => a.id))
  await Promise.all(state.apps.map(async app => {
    try { state.states[app.id] = await fetch(`http://127.0.0.1:${app.port}/api/state`, { cache: 'no-store' }).then(r => r.json()) } catch {}
  }))
  initTheme()
  mountThemeControls($('#theme-controls'), { compact: true })
  render()
}
load().catch(e => { document.querySelector('main').innerHTML = `<div class="empty">节律加载失败：${esc(e.message)}</div>` })
