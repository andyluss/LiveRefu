import {
  INITIAL_STATE, createInitialState, displayText, expressionText, reduce,
  deserializeHistory, serializeHistory, entryToNumber,
} from '../src/core/index.js'

const KEYS = {
  state: 'live-calc-state-v1',
  memory: 'live-calc-memory-v1',
}
const SKINS = {
  archive: 'Archive / 纸感',
  console: 'Console / 深色',
  phosphor: 'Phosphor / 荧光',
}
const store = {
  get(key, fallback) { try { return localStorage.getItem(key) ?? fallback } catch { return fallback } },
  set(key, value) { try { localStorage.setItem(key, value) } catch {} },
  remove(key) { try { localStorage.removeItem(key) } catch {} },
}
function readHistory() {
  return deserializeHistory(store.get(KEYS.state, null))
}
let state = createInitialState(readHistory())
let memory = (() => {
  try { const raw = store.get(KEYS.memory, null); if (raw === null) return null; const n = Number(raw); return Number.isFinite(n) ? n : null } catch { return null }
})()

const el = {
  expression: document.getElementById('expression'),
  value: document.getElementById('value'),
  memoryChip: document.getElementById('memoryChip'),
  errorChip: document.getElementById('errorChip'),
  tapeList: document.getElementById('tapeList'),
  tapeEmpty: document.getElementById('tapeEmpty'),
  skinName: document.getElementById('skinName'),
  net: document.getElementById('net'),
  install: document.getElementById('install'),
  tapeToggle: document.getElementById('tapeToggle'),
}

function currentValue() {
  return state.entry !== null ? entryToNumber(state.entry) : state.value
}
function persist() {
  store.set(KEYS.state, serializeHistory(state.history))
  if (memory === null) store.remove(KEYS.memory)
  else store.set(KEYS.memory, String(memory))
}
function dispatch(action) {
  state = reduce(state, action)
  persist()
  render()
  if (navigator.vibrate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    try { navigator.vibrate(7) } catch {}
  }
}
function loadValue(value) { dispatch({ type: 'load', value }) }

function render() {
  const expr = expressionText(state)
  el.expression.textContent = expr || '\u00a0'
  el.value.textContent = displayText(state)
  el.errorChip.hidden = state.error === null
  el.memoryChip.hidden = memory === null
  el.skinName.textContent = SKINS[document.documentElement.dataset.skin] || SKINS.archive
  renderTape()
}
function renderTape() {
  el.tapeList.textContent = ''
  const items = state.history
  el.tapeEmpty.hidden = items.length !== 0
  for (const item of items.slice().reverse()) {
    const li = document.createElement('li')
    const btn = document.createElement('button')
    btn.type = 'button'; btn.className = 'tape-item'; btn.dataset.id = String(item.id)
    const e = document.createElement('span'); e.className = 'e'; e.textContent = item.expression
    const r = document.createElement('span'); r.className = 'r' + (item.error ? ' err' : ''); r.textContent = item.result
    btn.append(e, r)
    btn.addEventListener('click', () => { dispatch({ type: 'recall', id: item.id }); closeTape() })
    li.appendChild(btn); el.tapeList.appendChild(li)
  }
}

function setSkin(id) {
  if (!SKINS[id]) return
  document.documentElement.dataset.skin = id
  store.set('calc-skin', id)
  document.querySelectorAll('[data-skin]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.skin === id)))
  render()
}

function handleAction(action, value) {
  if (action === 'memory') {
    if (value === 'clear') { memory = null; persist(); render() }
    if (value === 'recall' && memory !== null) loadValue(memory)
    if (value === 'add' || value === 'sub') {
      if (state.error) return
      const n = currentValue()
      memory = (memory ?? 0) + (value === 'add' ? n : -n)
      persist(); render()
    }
    return
  }
  if (action === 'operator') return dispatch({ type: 'operator', operator: value })
  if (action === 'unary') return dispatch({ type: 'unary', operator: value })
  if (action === 'digit') return dispatch({ type: 'digit', digit: value })
  if (action === 'decimal') return dispatch({ type: 'decimal' })
  if (action === 'equals') return dispatch({ type: 'equals' })
  if (action === 'backspace') return dispatch({ type: 'backspace' })
  if (action === 'clear') return dispatch({ type: 'clear' })
  if (action === 'clearEntry') return dispatch({ type: 'clearEntry' })
  if (action === 'negate') return dispatch({ type: 'negate' })
  if (action === 'load') return loadValue(value)
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('button')
  if (!target) return
  if (target.dataset.digit) return handleAction('digit', target.dataset.digit)
  if (target.dataset.operator) return handleAction('operator', target.dataset.operator)
  if (target.dataset.unary) return handleAction('unary', target.dataset.unary)
  if (target.dataset.memory) return handleAction('memory', target.dataset.memory)
  if (target.dataset.action) return handleAction(target.dataset.action)
  if (target.dataset.skin) return setSkin(target.dataset.skin)
})

document.getElementById('clearTape').addEventListener('click', () => {
  state = { ...state, history: [] }
  persist(); render()
})
el.tapeToggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('tape-open')
  el.tapeToggle.setAttribute('aria-expanded', String(open))
})
function closeTape() {
  document.body.classList.remove('tape-open')
  el.tapeToggle.setAttribute('aria-expanded', 'false')
}
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const key = event.key
  if (/^[0-9]$/.test(key)) { event.preventDefault(); handleAction('digit', key) }
  else if (key === '.') { event.preventDefault(); handleAction('decimal') }
  else if (key === '+') { event.preventDefault(); handleAction('operator', 'add') }
  else if (key === '-') { event.preventDefault(); handleAction('operator', 'sub') }
  else if (key === '*') { event.preventDefault(); handleAction('operator', 'mul') }
  else if (key === '/') { event.preventDefault(); handleAction('operator', 'div') }
  else if (key === 'Enter' || key === '=') { event.preventDefault(); handleAction('equals') }
  else if (key === 'Escape') { event.preventDefault(); handleAction('clear') }
  else if (key === 'Backspace') { event.preventDefault(); handleAction('backspace') }
  else if (key === 'Delete') { event.preventDefault(); handleAction('clearEntry') }
  else if (key === '%') { event.preventDefault(); handleAction('unary', 'percent') }
  else if (key === '_') { event.preventDefault(); handleAction('negate') }
  else if (key.toLowerCase() === 'r') { event.preventDefault(); handleAction('unary', 'sqrt') }
  else if (key.toLowerCase() === 'q') { event.preventDefault(); handleAction('unary', 'square') }
  else if (key.toLowerCase() === 'i') { event.preventDefault(); handleAction('unary', 'reciprocal') }
  else if (key.toLowerCase() === 'c') { event.preventDefault(); handleAction('clearEntry') }
})

const savedSkin = document.documentElement.dataset.skin || 'archive'
setSkin(savedSkin)

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('/sw.js').then(() => {
    el.net.textContent = '离线就绪'
  }).catch(() => {
    el.net.textContent = '本地'
  })
} else {
  el.net.textContent = '本地'
}

let deferred = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferred = e; el.install.hidden = false
})
el.install.addEventListener('click', async () => {
  if (!deferred) return
  deferred.prompt(); await deferred.userChoice; deferred = null; el.install.hidden = true
})

render()
