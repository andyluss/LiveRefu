import { initTheme, mountThemeControls } from '/shared/theme.js'
const $ = (s, r = document) => r.querySelector(s)
const state = { apps: [], filter: '全部', query: '', status: {}, metrics: {}, online: 0 }
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
function render() {
  const groups = [...new Set(visible().map(a => a.group))]
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
      if (m) state.metrics[app.id] = { label: m.label, value: m.value }
    } catch {}
  } catch { state.status[app.id] = 'offline' }
}
async function refresh() {
  $('#online').textContent = '检查中…'
  state.online = 0
  await Promise.all(state.apps.map(async app => { await inspect(app); if (state.status[app.id] === 'online') state.online++ }))
  render()
}
async function load() {
  state.apps = await fetch('/api/apps').then(r => r.json())
  initTheme()
  mountThemeControls($('#theme-controls'), { compact: true })
  $('#search').oninput = e => { state.query = e.target.value; render() }
  $('#refresh').onclick = refresh
  render()
  await refresh()
}
load().catch(e => { $('#groups').innerHTML = `<div class="empty">启动失败：${esc(e.message)}</div>` })
