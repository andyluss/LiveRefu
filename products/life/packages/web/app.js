import { initTheme, mountThemeControls } from './theme.js'
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const state = { data: null, view: 'core', query: '' }
function collectionOf(view) {
  if (view === 'core') return { ...state.data.config, moduleId: null, isModule: false }
  for (const pack of state.data.config.packs || []) {
    const module = pack.modules.find(m => m.id === view)
    if (module) return { ...module, moduleId: module.id, packId: pack.id, isModule: true }
  }
  return null
}
function enabledModules() {
  const packs = state.data.settings.packs || {}
  return (state.data.config.packs || []).filter(p => packs[p.id]).flatMap(p => p.modules.map(m => ({ ...m, packId: p.id })))
}
function summaryOf(view) {
  return view === 'core' ? state.data.summary : state.data.modules[view]?.summary
}
function entriesOf(view) {
  return view === 'core' ? state.data.entries : state.data.modules[view]?.entries || []
}
function route() {
  const raw = location.hash.replace(/^#\/?/, '') || 'core'
  const allowed = ['core', 'settings', ...enabledModules().map(m => m.id)]
  state.view = allowed.includes(raw) ? raw : 'core'
  render()
}
function go(view) { location.hash = `#/${view}` }

function renderTopbar(config) {
  const top = $('#topbar')
  if (!top) return
  top.innerHTML = `<a class="brand" href="#/core"><span class="brand-mark">${esc(config.name.slice(0, 1))}</span><span><b>${esc(config.name)}</b><small>${esc(config.english)} · LIFE</small></span></a><span class="spacer"></span><div id="theme-controls" class="theme-controls"></div>`
  mountThemeControls($('#theme-controls'), { compact: true })
}
function renderNav() {
  const modules = enabledModules()
  return `<nav class="life-nav" aria-label="模块"><button data-view="core" class="${state.view === 'core' ? 'active' : ''}">${esc(state.data.config.name)}</button>${modules.map(m => `<button data-view="${m.id}" class="${state.view === m.id ? 'active' : ''}">${esc(m.name)}</button>`).join('')}<button data-view="settings" class="${state.view === 'settings' ? 'active' : ''}">设置</button></nav>`
}
function metric(label, value, note = '') { return `<div class="metric"><div class="label">${esc(label)}</div><b>${esc(value)}</b><small>${esc(note)}</small></div>` }
function empty(text = '还没有记录。') { return `<div class="empty">${esc(text)}</div>` }
function chart(values) {
  const data = values.length === 14 ? values : [...new Array(14 - values.length).fill(0), ...values]
  const max = Math.max(1, ...data)
  return `<div class="bars">${data.map((v, i) => { const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(5, 10).replace('-', '/'); return `<div class="bar-col"><i class="bar" style="height:${Math.max(2, v / max * 100)}%" title="${d}: ${v}"></i><span class="bar-label">${d.slice(3)}</span></div>` }).join('')}</div>`
}
function renderCollection() {
  const collection = collectionOf(state.view)
  if (!collection) { state.view = 'core'; return renderCollection() }
  const summary = summaryOf(state.view)
  const entries = entriesOf(state.view)
  const cols = collection.columns.map(k => collection.fields.find(f => f.key === k)).filter(Boolean)
  const filtered = entries.filter(e => !state.query || [e.date, ...Object.values(e.data)].join(' ').toLowerCase().includes(state.query.toLowerCase()))
  const rows = filtered.slice(0, 80).map(entry => `<tr>${cols.map(f => `<td>${f.key === 'date' ? esc(entry.date) : esc(formatValue(f, entry.data[f.key]))}</td>`).join('')}<td class="right"><button class="btn btn-ghost btn-sm" data-edit="${entry.id}">编辑</button><button class="btn btn-ghost btn-sm" data-delete="${entry.id}">删除</button></td></tr>`).join('')
  return `${pageHead(collection.isModule ? 'PACK · ' + (collection.packId || '') : collection.english || 'CORE', collection.isModule ? collection.name : collection.name, collection.isModule ? collection.entryLabel + '；记录只在本机。' : collection.tagline, `<a class="btn" href="/api/backup">备份</a><button class="btn btn-primary" data-new>＋ ${esc(collection.entryLabel)}</button>`)}
  <div class="grid grid-3">${(summary?.metrics || []).map(m => metric(m.label, m.value, m.note || '')).join('')}</div>
  <div class="grid grid-2" style="margin-top:12px"><div class="card"><div class="card-head"><div><small>14 DAYS</small><h2>${esc(summary?.chart?.label || '趋势')}</h2></div></div>${chart(summary?.chart?.values || [])}${summary?.hint ? `<p class="hint" style="margin-top:6px">${esc(summary.hint)}</p>` : ''}</div><div class="card"><div class="card-head"><div><small>ABOUT</small><h2>${collection.isModule ? '扩展模块' : '核心记录'}</h2></div></div><p class="hint">${esc(collection.isModule ? collection.entryLabel + '。关闭扩展包不删除数据。' : collection.description)}</p><p class="hint" style="margin-top:8px">数据只在本机；写入前保留 <code>.bak</code>。</p></div></div>
  <div class="card" style="margin-top:12px"><div class="card-head"><div><small>ENTRIES</small><h2>记录</h2></div><span class="hint">${filtered.length} 条</span></div><div class="toolbar"><input type="search" id="search" placeholder="搜索记录…" value="${esc(state.query)}"></div><div class="table-wrap"><table><thead><tr>${cols.map(f => `<th>${esc(f.label)}</th>`).join('')}<th></th></tr></thead><tbody>${rows || `<tr><td colspan="${cols.length + 1}">${empty()}</td></tr>`}</tbody></table></div></div>`
}
function renderSettings() {
  const config = state.data.config
  const packs = config.packs || []
  const rows = packs.map(p => `<div class="pack-row"><div><b>${esc(p.name)}</b><small>${esc(p.description)}</small><div class="hint">${p.modules.map(m => esc(m.name)).join(' · ')}</div></div><label class="switch"><input type="checkbox" data-pack="${p.id}" ${state.data.settings.packs[p.id] ? 'checked' : ''}><span>${state.data.settings.packs[p.id] ? '已开启' : '关闭'}</span></label></div>`).join('')
  return `${pageHead('SETTINGS', '设置', '扩展包按需开启；关闭后导航隐藏，但数据保留。')}<div class="grid grid-2"><div class="card"><div class="card-head"><div><small>PACKS</small><h2>扩展包</h2></div></div>${rows || empty('这款应用没有扩展包。')}</div><div class="card"><div class="card-head"><div><small>DATA</small><h2>数据</h2></div></div><p class="hint">核心记录与扩展模块都在同一个 <code>data/store.json</code>。</p><p class="hint" style="margin-top:8px"><a href="/api/backup">下载完整备份</a></p><p class="hint" style="margin-top:8px">主题由 Life 共享层提供；外观写入 <code>lrds-theme</code>。</p></div></div>`
}
function pageHead(kicker, title, desc, actions = '') { return `<div class="page-head"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1>${desc ? `<p>${esc(desc)}</p>` : ''}</div><div class="page-actions">${actions}</div></div>` }
function formatValue(field, value) {
  if (value === '' || value === undefined) return '—'
  if (field.type === 'rating') return `${value} / 5`
  return String(value)
}
function render() {
  if (!state.data) return
  const config = state.data.config
  document.title = `${config.name} · ${config.english}`
  document.documentElement.style.setProperty('--life-accent', config.accent)
  document.documentElement.style.setProperty('--life-on-accent', config.accentOn)
  renderTopbar(config)
  $('#app').innerHTML = renderNav() + (state.view === 'settings' ? renderSettings() : renderCollection())
  bind()
}
function bind() {
  $$('[data-view]').forEach(b => b.onclick = () => go(b.dataset.view))
  const search = $('#search'); if (search) search.oninput = e => { state.query = e.target.value; render(); requestAnimationFrame(() => { const s = $('#search'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length) } }) }
  $$('[data-new]').forEach(b => b.onclick = () => editor(null))
  $$('[data-edit]').forEach(b => b.onclick = () => editor(entriesOf(state.view).find(e => e.id === b.dataset.edit)))
  $$('[data-delete]').forEach(b => b.onclick = async () => {
    if (!confirm('删除这条记录？')) return
    const collection = collectionOf(state.view)
    const path = collection.isModule ? `/api/modules/${encodeURIComponent(collection.id)}/${encodeURIComponent(b.dataset.delete)}` : `/api/entries/${encodeURIComponent(b.dataset.delete)}`
    try { state.data = await api(path, 'DELETE'); render(); toast('已删除') } catch (e) { toast(e.message) }
  })
  $$('[data-pack]').forEach(input => input.onchange = async () => {
    try {
      state.data = await api('/api/settings', 'PATCH', { packs: { [input.dataset.pack]: input.checked } })
      if (state.view !== 'core' && state.view !== 'settings' && !enabledModules().some(m => m.id === state.view)) go('core')
      else render()
      toast(input.checked ? '扩展包已开启' : '扩展包已关闭')
    } catch (e) { toast(e.message) }
  })
}
function fieldInput(field, value) {
  if (field.type === 'textarea') return `<textarea id="f-${field.key}" rows="3" placeholder="${esc(field.placeholder || '')}">${esc(value)}</textarea>`
  if (field.type === 'select') return `<select id="f-${field.key}">${(field.options || []).map(o => `<option${String(value) === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`
  if (field.type === 'rating') return `<select id="f-${field.key}">${[1,2,3,4,5].map(n => `<option value="${n}"${Number(value) === n ? ' selected' : ''}>${n} / 5</option>`).join('')}</select>`
  const type = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'
  return `<input id="f-${field.key}" type="${type}" value="${esc(value)}" placeholder="${esc(field.placeholder || '')}" ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''} ${field.step !== undefined ? `step="${field.step}"` : ''}>`
}
function editor(entry) {
  const collection = collectionOf(state.view)
  if (!collection) return
  const isEdit = !!entry
  const fields = collection.fields.map(f => {
    const value = f.key === 'date' ? (entry?.date || new Date().toISOString().slice(0, 10)) : (entry?.data?.[f.key] ?? f.default ?? '')
    return `<div class="field"><label for="f-${f.key}">${esc(f.label)}${f.required ? ' *' : ''}</label>${fieldInput(f, value)}${f.help ? `<small class="hint">${esc(f.help)}</small>` : ''}</div>`
  }).join('')
  $('#modal-body').innerHTML = `<div class="field-row">${fields}</div>`
  $('#modal-title').textContent = isEdit ? '编辑记录' : `新增 · ${collection.entryLabel}`
  $('#modal-kicker').textContent = collection.isModule ? collection.name : state.data.config.english
  $('#modal-submit').textContent = isEdit ? '保存' : '记录'
  const form = $('#modal-form')
  form.onsubmit = async e => {
    e.preventDefault()
    const data = {}
    for (const f of collection.fields) { if (f.key === 'date') continue; const el = $(`#f-${f.key}`); if (el) data[f.key] = f.type === 'number' || f.type === 'rating' ? Number(el.value) : el.value }
    const date = $('#f-date')?.value || new Date().toISOString().slice(0, 10)
    const path = isEdit ? (collection.isModule ? `/api/modules/${encodeURIComponent(collection.id)}/${encodeURIComponent(entry.id)}` : `/api/entries/${encodeURIComponent(entry.id)}`) : (collection.isModule ? `/api/modules/${encodeURIComponent(collection.id)}` : '/api/entries')
    try { state.data = await api(path, isEdit ? 'PATCH' : 'POST', { date, data }); $('#modal').close(); render(); toast(isEdit ? '已保存' : '已记录') } catch (err) { toast(err.message) }
  }
  $$('[data-close]').forEach(b => b.onclick = () => $('#modal').close())
  if (!$('#modal').open) $('#modal').showModal()
}
async function api(path, method = 'GET', body) {
  const res = await fetch(path, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败 ${res.status}`)
  return data
}
let toastTimer
function toast(message) { const el = $('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200) }
async function load() {
  state.data = await api('/api/state')
  initTheme()
  if (!location.hash) location.hash = '#/core'
  route()
}
window.addEventListener('hashchange', () => { if (state.data) route() })
load().catch(err => { console.error(err); document.body.innerHTML = `<div class="empty">启动失败：${esc(err.message)}</div>` })
