import { initTheme, mountThemeControls } from '/shared/theme.js'
const $ = (s, r = document) => r.querySelector(s)
const state = { apps: [], filter: '全部', query: '', status: {}, metrics: {}, states: {}, online: 0, rhythmMode: 'day' }
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
function groupOf(app) { return app.group }
function filters() {
  const groups = ['全部', ...new Set(state.apps.map(a => a.group))]
  return groups.map(g => `<button data-filter="${esc(g)}" class="${state.filter === g ? 'active' : ''}">${esc(g)}</button>`).join('')
}
function visible() {
  const q = state.query.toLowerCase()
  return state.apps.filter(a => (state.filter === '全部' || a.group === state.filter) && (!q || `${a.name} ${a.english} ${a.description} ${a.group}`.toLowerCase().includes(q)))
}
function card(app) {
  const status = state.status[app.id]
  const metric = state.metrics[app.id]
  const online = status === 'online'
  return `<a class="app-card" href="http://127.0.0.1:${app.port}/" target="_blank" rel="noopener"><div class="card-top"><div><div class="app-name">${esc(app.name)}</div><div class="app-en">${esc(app.english)} · ${esc(app.id)}</div></div><span class="status ${online ? 'online' : 'offline'}">${online ? '在线' : status === 'offline' ? '未启动' : '检查中'}</span></div><div class="desc">${esc(app.description)}</div><div class="metric"><span>${esc(metric?.label || '入口')}</span><b>${esc(metric?.value || '打开 →')}</b></div><div class="port">127.0.0.1:${app.port}</div></a>`
}

function datesOf(app, st) {
  if (!st) return []
  if (Array.isArray(st.entries)) return st.entries.map(e => e.date).filter(Boolean)
  if (Array.isArray(st.transactions)) return st.transactions.map(t => t.date).filter(Boolean)
  return []
}
function dayKey(d) { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
function rhythmData() {
  const now = new Date()
  if (state.rhythmMode === 'week') {
    const buckets = []
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() - i * 7)
      const start = new Date(end); start.setDate(start.getDate() - 6)
      buckets.push({ start: dayKey(start), end: dayKey(end), label: `${start.getMonth() + 1}/${start.getDate()}`, count: 0 })
    }
    for (const app of state.apps) for (const d of datesOf(app, state.states[app.id])) {
      const b = buckets.find(b => d >= b.start && d <= b.end)
      if (b) b.count++
    }
    return buckets
  }
  const buckets = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
    buckets.push({ start: dayKey(d), end: dayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 })
  }
  for (const app of state.apps) for (const d of datesOf(app, state.states[app.id])) {
    const b = buckets.find(b => b.start === d)
    if (b) b.count++
  }
  return buckets
}
function renderRhythm() {
  const buckets = rhythmData()
  const max = Math.max(1, ...buckets.map(b => b.count))
  const total = buckets.reduce((s, b) => s + b.count, 0)
  const active = new Set()
  for (const app of state.apps) if (datesOf(app, state.states[app.id]).length) active.add(app.id)
  let streak = 0
  const all = new Set(state.apps.flatMap(app => datesOf(app, state.states[app.id])))
  const cursor = new Date(); cursor.setHours(0, 0, 0, 0)
  while (all.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
  $('#rhythm').innerHTML = `<div class="rhythm-head"><div><div class="eyebrow">CROSS-APP RHYTHM</div><h2>跨应用节律</h2><p>把所有 app 的记录按日/周聚合；只读，不复制数据。</p></div><div class="rhythm-modes"><button data-rhythm="day" class="${state.rhythmMode === 'day' ? 'active' : ''}">日 · 14 天</button><button data-rhythm="week" class="${state.rhythmMode === 'week' ? 'active' : ''}">周 · 8 周</button></div></div><div class="rhythm-chart">${buckets.map(b => `<div class="rhythm-col"><i style="height:${Math.max(2, b.count / max * 100)}%" title="${b.label}: ${b.count} 条"></i><span>${b.label}</span></div>`).join('')}</div><div class="rhythm-stats"><div><b>${total}</b>记录（${state.rhythmMode === 'day' ? '14 天' : '8 周'}）</div><div><b>${active.size}</b>有记录的应用</div><div><b>${streak}</b>连续记录天数</div></div>`
  document.querySelectorAll('[data-rhythm]').forEach(b => b.onclick = () => { state.rhythmMode = b.dataset.rhythm; render() })
}

function render() {
  const groups = [...new Set(visible().map(a => a.group))]
  renderRhythm()
  $('#filters').innerHTML = filters()
  $('#groups').innerHTML = groups.length ? groups.map(g => `<section class="home-group"><h2>${esc(g)}</h2><div class="home-grid">${visible().filter(a => a.group === g).map(card).join('')}</div></section>`).join('') : `<div class="empty">没有匹配的应用。</div>`
  $('#online').textContent = `在线 ${state.online} / ${state.apps.length}`
  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { state.filter = b.dataset.filter; render() })
}
async function inspect(app) {
  try {
    const health = await fetch(`http://127.0.0.1:${app.port}/api/health`, { signal: AbortSignal.timeout(1200), cache: 'no-store' })
    if (!health.ok) throw new Error('offline')
    state.status[app.id] = 'online'
    try {
      const st = await fetch(`http://127.0.0.1:${app.port}/api/state`, { signal: AbortSignal.timeout(1200), cache: 'no-store' }).then(r => r.json())
      const m = st?.summary?.metrics?.[0]
      state.states[app.id] = st
      if (m) state.metrics[app.id] = { label: m.label, value: m.value }
    } catch {}
  } catch { state.status[app.id] = 'offline' }
}
async function refresh() {
  $('#online').textContent = '检查中…'
  state.online = 0
  state.states = {}
  await Promise.all(state.apps.map(async app => { await inspect(app); if (state.status[app.id] === 'online') state.online++ }))
  render()
}
let toastTimer
function toast(message) { let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el) } el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200) }
async function load() {
  state.apps = await fetch('/api/apps').then(r => r.json())
  initTheme()
  mountThemeControls($('#theme-controls'), { compact: true })
  $('#search').oninput = e => { state.query = e.target.value; render() }
  $('#refresh').onclick = refresh
  $('#import-all').onchange = async e => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const data = JSON.parse(await file.text())
      const out = await fetch('/api/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
      if (out.error) throw new Error(out.error)
      toast(`已导入 ${out.imported.length} 款应用`)
      await refresh()
    } catch (err) { toast(err.message) }
  }
  render()
  await refresh()
}
load().catch(e => { $('#groups').innerHTML = `<div class="empty">启动失败：${esc(e.message)}</div>` })
