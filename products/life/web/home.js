import { initTheme, mountThemeControls } from '/shared/theme.js'
const $ = (s, r = document) => r.querySelector(s)
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const LAYOUT_KEY = 'life-fusion-layout-v1'
const DEFAULT_SIZES = {
  ledger: [5, 4], sleep: [4, 3], meal: [3, 3], move: [3, 3], read: [4, 3], home: [3, 3],
  wear: [3, 3], hydrate: [3, 3], journal: [3, 3], watch: [3, 3], listen: [3, 3],
  learn: [3, 3], travel: [3, 3], care: [3, 3], organize: [3, 3], connect: [3, 3]
}
const state = { apps: [], filter: '全部', query: '', status: {}, metrics: {}, states: {}, online: 0, layout: {}, drag: null }
function groupOf(app) { return app.group }
function filters() {
  const groups = ['全部', ...new Set(state.apps.map(a => a.group))]
  return groups.map(g => `<button data-filter="${esc(g)}" class="${state.filter === g ? 'active' : ''}">${esc(g)}</button>`).join('')
}
function visible() {
  const q = state.query.toLowerCase()
  return state.apps.filter(a => (state.filter === '全部' || a.group === state.filter) && (!q || `${a.name} ${a.english} ${a.description} ${a.group}`.toLowerCase().includes(q)))
}
function overlap(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h }
function canPlace(layout, id, x, y, w, h) {
  if (x < 1 || y < 1 || w < 2 || h < 2 || w > 6 || h > 6 || x + w - 1 > 12) return false
  const next = { x, y, w, h }
  return Object.entries(layout).every(([other, item]) => other === id || !overlap(next, item))
}
function findSpot(layout, id, w, h) {
  for (let y = 1; y < 200; y++) for (let x = 1; x + w - 1 <= 12; x++) if (canPlace(layout, id, x, y, w, h)) return { x, y, w, h }
  return { x: 1, y: 199, w, h }
}
function buildDefault() {
  const layout = {}
  for (const app of state.apps) {
    const [w, h] = DEFAULT_SIZES[app.id] || [3, 3]
    layout[app.id] = findSpot(layout, app.id, w, h)
  }
  return layout
}
function loadLayout() {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}') } catch {}
  const layout = {}
  for (const app of state.apps) {
    const item = saved[app.id]
    if (item && Number.isInteger(item.x) && Number.isInteger(item.y) && Number.isInteger(item.w) && Number.isInteger(item.h) && canPlace(layout, app.id, item.x, item.y, item.w, item.h)) layout[app.id] = item
    else {
      const [w, h] = DEFAULT_SIZES[app.id] || [3, 3]
      layout[app.id] = findSpot(layout, app.id, w, h)
    }
  }
  return layout
}
function saveLayout() { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(state.layout)) } catch {} }
function sizeClass(w) { return w <= 2 ? 's' : w <= 3 ? 'm' : 'l' }
function card(app) {
  const status = state.status[app.id]
  const metric = state.metrics[app.id]
  const online = status === 'online'
  const item = state.layout[app.id]
  const link = online ? `<a class="fapp-link" href="http://127.0.0.1:${app.port}/" target="_blank" rel="noopener">` : '<div class="fapp-link" aria-disabled="true">'
  const close = online ? '</a>' : '</div>'
  return `<article class="fapp ${online ? 'is-online' : 'is-offline'}" data-id="${esc(app.id)}" data-size="${sizeClass(item.w)}" data-h="${item.h}" style="grid-column:${item.x} / span ${item.w};grid-row:${item.y} / span ${item.h}">
    <button class="drag-handle" data-drag="${esc(app.id)}" aria-label="移动 ${esc(app.name)}" title="拖动移动；方向键移动，Shift+方向键缩放">⠿</button>
    ${link}
      <div class="card-top"><div class="app-title"><img class="app-logo" src="/shared/logos/${esc(app.id)}.svg" alt=""><div><div class="app-name">${esc(app.name)}</div><div class="app-en">${esc(app.english)} · ${esc(app.id)}</div></div></div><span class="status ${online ? 'online' : 'offline'}">${online ? '在线' : status === 'offline' ? '未启动' : '检查中'}</span></div>
      <div class="desc">${esc(app.description)}</div>
      <div class="metric"><span>${esc(metric?.label || '入口')}</span><b>${esc(metric?.value || (online ? '打开 →' : '未启动'))}</b></div>
      <div class="port">127.0.0.1:${app.port}</div>
    ${close}
    <button class="resize-handle" data-resize="${esc(app.id)}" aria-label="缩放 ${esc(app.name)}" title="拖动缩放">◢</button>
  </article>`
}
function setCell() {
  const board = $('#board')
  const cell = Math.max(32, Math.floor((board.clientWidth - 16 - 11 * 8) / 12))
  board.style.setProperty('--cell', `${cell}px`)
  return cell
}
function render() {
  $('#filters').innerHTML = filters()
  const apps = visible()
  const rows = Math.max(3, ...Object.values(state.layout).map(i => i.y + i.h - 1))
  const board = $('#board')
  const cell = setCell()
  board.style.minHeight = `${rows * (cell + 8) + 16}px`
  board.innerHTML = apps.length ? apps.map(card).join('') : '<div class="fusion-empty">没有匹配的应用。</div>'
  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { state.filter = b.dataset.filter; render() })
  document.querySelectorAll('[data-drag]').forEach(b => {
    b.onpointerdown = e => startDrag(e, b.dataset.drag, 'move')
    b.onkeydown = e => keyboardMove(e, b.dataset.drag, 'move')
  })
  document.querySelectorAll('[data-resize]').forEach(b => b.onpointerdown = e => startDrag(e, b.dataset.resize, 'resize'))
  $('#online').textContent = `在线 ${state.online} / ${state.apps.length}`
}
function ghostAt(x, y, w, h, valid) {
  let ghost = $('#fusion-ghost')
  if (!ghost) { ghost = document.createElement('div'); ghost.id = 'fusion-ghost'; ghost.className = 'fusion-ghost'; $('#board').appendChild(ghost) }
  ghost.style.gridColumn = `${x} / span ${w}`
  ghost.style.gridRow = `${y} / span ${h}`
  ghost.classList.toggle('invalid', !valid)
}
function clearGhost() { $('#fusion-ghost')?.remove() }
function metrics() {
  const board = $('#board')
  const gap = 8
  const cell = Number.parseFloat(getComputedStyle(board).getPropertyValue('--cell')) || Math.floor((board.clientWidth - 16 - 11 * gap) / 12)
  return { cell: cell + gap, row: cell + gap }
}
function startDrag(e, id, mode) {
  if (e.button !== undefined && e.button !== 0) return
  e.preventDefault(); e.stopPropagation()
  const item = { ...state.layout[id] }
  const m = metrics()
  state.drag = { id, mode, item, startX: e.clientX, startY: e.clientY, cell: m.cell, row: m.row, valid: false, target: item }
  e.currentTarget.closest('.fapp')?.classList.add('is-dragging')
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', endDrag, { once: true })
  window.addEventListener('pointercancel', endDrag, { once: true })
}
function onDrag(e) {
  const d = state.drag; if (!d) return
  const dx = Math.round((e.clientX - d.startX) / d.cell)
  const dy = Math.round((e.clientY - d.startY) / d.row)
  let { x, y, w, h } = d.item
  if (d.mode === 'move') {
    w = d.item.w; h = d.item.h
    x = Math.min(12 - w + 1, Math.max(1, d.item.x + dx))
    y = Math.max(1, d.item.y + dy)
  } else {
    w = Math.min(6, Math.max(2, d.item.w + dx)); h = Math.min(6, Math.max(2, d.item.h + dy))
  }
  d.target = { x, y, w, h }
  d.valid = canPlace(state.layout, d.id, x, y, w, h)
  ghostAt(x, y, w, h, d.valid)
}
function endDrag() {
  const d = state.drag; if (!d) return
  window.removeEventListener('pointermove', onDrag)
  document.querySelectorAll('.fapp.is-dragging').forEach(el => el.classList.remove('is-dragging'))
  clearGhost()
  if (d.valid && d.target) { state.layout[d.id] = d.target; saveLayout(); toast(d.mode === 'move' ? '位置已保存' : '大小已保存') }
  state.drag = null
  render()
}
function keyboardMove(e, id, mode) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
  e.preventDefault()
  const item = { ...state.layout[id] }
  const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
  const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
  let next
  if (e.shiftKey) next = { ...item, w: Math.min(6, Math.max(2, item.w + dx)), h: Math.min(6, Math.max(2, item.h + dy)) }
  else next = { ...item, x: Math.min(12 - item.w + 1, Math.max(1, item.x + dx)), y: Math.max(1, item.y + dy) }
  if (!canPlace(state.layout, id, next.x, next.y, next.w, next.h)) return
  state.layout[id] = next; saveLayout(); render()
  document.querySelector(`[data-drag="${CSS.escape(id)}"]`)?.focus()
}
async function inspect(app) {
  try {
    const health = await fetch(`http://127.0.0.1:${app.port}/api/health`, { signal: AbortSignal.timeout(1200), cache: 'no-store' })
    if (!health.ok) throw new Error('offline')
    state.status[app.id] = 'online'
    try {
      const st = await fetch(`http://127.0.0.1:${app.port}/api/state`, { signal: AbortSignal.timeout(1200), cache: 'no-store' }).then(r => r.json())
      state.states[app.id] = st
      const m = st?.summary?.metrics?.[0]
      if (m) state.metrics[app.id] = { label: m.label, value: m.value }
    } catch {}
  } catch { state.status[app.id] = 'offline' }
}
async function refresh() {
  $('#online').textContent = '检查中…'
  state.online = 0; state.states = {}
  await Promise.all(state.apps.map(async app => { await inspect(app); if (state.status[app.id] === 'online') state.online++ }))
  render()
}
let toastTimer
function toast(message) {
  let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el) }
  el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200)
}
async function load() {
  state.apps = await fetch('/api/apps').then(r => r.json())
  state.layout = loadLayout()
  saveLayout()
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => {
    const cell = setCell(); const rows = Math.max(3, ...Object.values(state.layout).map(i => i.y + i.h - 1))
    $('#board').style.minHeight = `${rows * (cell + 8) + 16}px`
  }).observe($('#board'))
  initTheme(); mountThemeControls($('#theme-controls'), { compact: true })
  $('#search').oninput = e => { state.query = e.target.value; render() }
  $('#refresh').onclick = refresh
  $('#reset-layout').onclick = () => {
    localStorage.removeItem(LAYOUT_KEY); state.layout = buildDefault(); saveLayout(); render(); toast('布局已重置')
  }
  $('#import-all').onchange = async e => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const data = JSON.parse(await file.text())
      const out = await fetch('/api/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
      if (out.error) throw new Error(out.error)
      toast(`已导入 ${out.imported.length} 款应用`); await refresh()
    } catch (err) { toast(err.message) }
  }
  render(); await refresh()
}
load().catch(e => { $('#board').innerHTML = `<div class="fusion-empty">启动失败：${esc(e.message)}</div>` })
