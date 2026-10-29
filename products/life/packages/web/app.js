const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const state = { data: null, mode: localStorage.getItem('lrds-theme') || 'system', query: '' }
const MODES = ['system', 'light', 'dark']
const modeLabel = { system: '系统', light: '浅色', dark: '深色' }
function applyAppearance() {
  const dark = state.mode === 'dark' || (state.mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = state.mode
  document.documentElement.dataset.appearance = dark ? 'dark' : 'light'
  document.documentElement.style.colorScheme = state.mode === 'system' ? 'light dark' : state.mode
  $$('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode))
}
function setMode(mode) {
  if (!MODES.includes(mode)) return
  state.mode = mode
  try { localStorage.setItem('lrds-theme', mode) } catch {}
  applyAppearance()
  render()
}
async function api(path, method = 'GET', body) {
  const res = await fetch(path, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败 ${res.status}`)
  return data
}
let toastTimer
function toast(message) { const el = $('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200) }
function label(field) { return field.label }
function fieldValue(entry, field) { return entry?.data?.[field.key] ?? field.default ?? '' }
function formatValue(field, value) {
  if (value === '' || value === undefined) return '—'
  if (field.type === 'rating') return `${value} / 5`
  if (field.type === 'number') return String(value)
  return String(value)
}
function dateLabel(date) { return date.slice(5).replace('-', '/') }
function chartValues() {
  const values = state.data?.summary?.chart?.values || []
  return values.length === 14 ? values : [...new Array(14 - values.length).fill(0), ...values]
}
function renderTopbar(config) {
  const top = $('#topbar')
  if (!top) return
  top.innerHTML = `<a class="brand" href="/"><span class="brand-mark">${esc(config.name.slice(0, 1))}</span><span><b>${esc(config.name)}</b><small>${esc(config.english)} · LIFE</small></span></a><span class="spacer"></span><div class="mode-switch" role="group" aria-label="外观">${MODES.map(m => `<button type="button" data-mode="${m}" class="${state.mode === m ? 'active' : ''}" title="${modeLabel[m]}">${m === 'system' ? '◐' : m === 'light' ? '☀' : '☾'}</button>`).join('')}</div>`
}
function render() {
  if (!state.data) return
  const { config, entries, summary } = state.data
  renderTopbar(config)
  document.title = `${config.name} · ${config.english}`
  document.documentElement.style.setProperty('--life-accent', config.accent)
  document.documentElement.style.setProperty('--life-on-accent', config.accentOn)
  const today = new Date().toISOString().slice(0, 10)
  const filtered = entries.filter(e => !state.query || [e.date, ...Object.values(e.data)].join(' ').toLowerCase().includes(state.query.toLowerCase()))
  const values = chartValues()
  const max = Math.max(1, ...values)
  const bars = values.map((v, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(5, 10).replace('-', '/')
    return `<div class="bar-col"><i class="bar" style="height:${Math.max(2, v / max * 100)}%" title="${d}: ${v}"></i><span class="bar-label">${d.slice(3)}</span></div>`
  }).join('')
  const metrics = (summary.metrics || []).map(m => `<div class="metric"><div class="label">${esc(m.label)}</div><b>${esc(m.value)}</b><small>${esc(m.note || '')}</small></div>`).join('')
  const columns = config.columns.map(key => config.fields.find(f => f.key === key)).filter(Boolean)
  const rows = filtered.slice(0, 60).map(entry => `<tr>${columns.map(f => `<td>${f.key === 'date' ? esc(entry.date) : esc(formatValue(f, entry.data[f.key]))}</td>`).join('')}<td class="right"><button class="btn btn-ghost btn-sm" data-edit="${entry.id}">编辑</button><button class="btn btn-ghost btn-sm" data-delete="${entry.id}">删除</button></td></tr>`).join('')
  $('#app').innerHTML = `
    <div class="page-head"><div><div class="eyebrow">${esc(config.english)} · ${esc(today)}</div><h1>${esc(config.name)}</h1><p>${esc(config.tagline)}</p></div><div class="page-actions">${summary.streak ? `<span class="streak">连续 ${summary.streak} 天</span>` : ''}<a class="btn" href="/api/backup">备份</a><button class="btn btn-primary" id="new-entry">＋ ${esc(config.entryLabel)}</button></div></div>
    <div class="grid grid-3">${metrics}</div>
    <div class="grid grid-2" style="margin-top:12px"><div class="card"><div class="card-head"><div><small>14 DAYS</small><h2>${esc(summary.chart?.label || '记录')}</h2></div></div><div class="bars">${bars}</div>${summary.hint ? `<p class="hint" style="margin-top:6px">${esc(summary.hint)}</p>` : ''}</div><div class="card"><div class="card-head"><div><small>HOW TO USE</small><h2>只记有用的</h2></div></div><p class="hint">${esc(config.description)}</p><p class="hint" style="margin-top:8px">数据只写在本机 <code>data/store.json</code>；写入前保留 <code>.bak</code>。</p></div></div>
    <div class="card" style="margin-top:12px"><div class="card-head"><div><small>ENTRIES</small><h2>记录</h2></div><span class="hint">${filtered.length} 条</span></div><div class="toolbar"><input type="search" id="search" placeholder="搜索记录…" value="${esc(state.query)}"></div><div class="table-wrap"><table><thead><tr>${columns.map(f => `<th>${esc(f.label)}</th>`).join('')}<th></th></tr></thead><tbody>${rows || `<tr><td colspan="${columns.length + 1}"><div class="empty">还没有记录。点右上角开始。</div></td></tr>`}</tbody></table></div></div>`
  $('#new-entry').onclick = () => editor()
  $('#search').oninput = e => { state.query = e.target.value; render() }
  $$('[data-edit]').forEach(b => b.onclick = () => editor(state.data.entries.find(e => e.id === b.dataset.edit)))
  $$('[data-delete]').forEach(b => b.onclick = async () => {
    if (!confirm('删除这条记录？')) return
    try { state.data = await api(`/api/entries/${encodeURIComponent(b.dataset.delete)}`, 'DELETE'); render(); toast('已删除') } catch (e) { toast(e.message) }
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
  const { config } = state.data
  const isEdit = !!entry
  const fieldsHtml = config.fields.map(f => {
    const value = f.key === 'date' ? (entry?.date || new Date().toISOString().slice(0, 10)) : fieldValue(entry, f)
    return `<div class="field"><label for="f-${f.key}">${esc(f.label)}${f.required ? ' *' : ''}</label>${fieldInput(f, value)}${f.help ? `<small class="hint">${esc(f.help)}</small>` : ''}</div>`
  }).join('')
  $('#modal-body').innerHTML = `<div class="field-row">${fieldsHtml}</div>`
  $('#modal-title').textContent = isEdit ? '编辑记录' : `新增 · ${config.entryLabel}`
  $('#modal-kicker').textContent = config.english
  $('#modal-submit').textContent = isEdit ? '保存' : '记录'
  const form = $('#modal-form')
  form.onsubmit = async e => {
    e.preventDefault()
    const data = {}
    for (const f of config.fields) {
      const el = $(`#f-${f.key}`)
      if (!el) continue
      if (f.key === 'date') continue
      data[f.key] = f.type === 'number' || f.type === 'rating' ? Number(el.value) : el.value
    }
    const date = $('#f-date')?.value || new Date().toISOString().slice(0, 10)
    try {
      state.data = await api(isEdit ? `/api/entries/${encodeURIComponent(entry.id)}` : '/api/entries', isEdit ? 'PATCH' : 'POST', { date, data })
      $('#modal').close(); render(); toast(isEdit ? '已保存' : '已记录')
    } catch (err) { toast(err.message) }
  }
  $$('[data-close]').forEach(b => b.onclick = () => $('#modal').close())
  if (!$('#modal').open) $('#modal').showModal()
}
async function load() {
  state.data = await api('/api/state')
  applyAppearance()
  render()
}
document.addEventListener('click', e => { const btn = e.target.closest('[data-mode]'); if (btn) setMode(btn.dataset.mode) })
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (state.mode === 'system') applyAppearance() })
load().catch(err => { console.error(err); document.body.innerHTML = `<div class="empty">启动失败：${esc(err.message)}</div>` })
