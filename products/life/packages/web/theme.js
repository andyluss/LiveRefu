import { THEMES } from './themes.generated.js'
const MODE_KEY = 'lrds-theme'
const STYLE_KEY = 'life-style'
const MODES = ['system', 'light', 'dark']
let family = 'paper'
let mode = 'system'
let onChange = null
let mediaBound = false

export { THEMES }
export function familyFor(value) {
  return THEMES.find(f => f.id === value) || THEMES.find(f => f.light === value || f.dark === value) || THEMES[0]
}
export function currentFamily() { return family }
export function currentMode() { return mode }
export function applyTheme() {
  const f = familyFor(family)
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  root.dataset.theme = mode
  root.dataset.style = dark ? f.dark : f.light
  root.dataset.appearance = dark ? 'dark' : 'light'
  root.style.colorScheme = mode === 'system' ? 'light dark' : mode
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode))
  document.querySelectorAll('[data-life-style]').forEach(sel => { sel.value = f.id })
}
export function setMode(next) {
  if (!MODES.includes(next)) return
  mode = next
  try { localStorage.setItem(MODE_KEY, next) } catch {}
  applyTheme()
}
export async function setFamily(next) {
  const f = familyFor(next)
  family = f.id
  try { localStorage.setItem(STYLE_KEY, f.id) } catch {}
  applyTheme()
  if (onChange) await onChange(f.id)
}
export function initTheme(options = {}) {
  try {
    const savedMode = localStorage.getItem(MODE_KEY)
    if (MODES.includes(savedMode)) mode = savedMode
    const savedFamily = localStorage.getItem(STYLE_KEY) || localStorage.getItem('manmanji-family')
    if (savedFamily) family = familyFor(savedFamily).id
  } catch {}
  if (options.mode && MODES.includes(options.mode)) mode = options.mode
  if (options.family) family = familyFor(options.family).id
  onChange = options.onChange || null
  if (!mediaBound) {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (mode === 'system') applyTheme() })
    mediaBound = true
  }
  applyTheme()
}
export function mountThemeControls(container, options = {}) {
  if (!container) return
  const compact = !!options.compact
  container.innerHTML = `<label class="theme-picker"><span>风格</span><select data-life-style>${THEMES.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}</select></label><div class="mode-switch" role="group" aria-label="外观">${MODES.map(m => `<button type="button" data-mode="${m}" title="${m === 'system' ? '跟随系统' : m === 'light' ? '浅色' : '深色'}">${m === 'system' ? '系统' : m === 'light' ? '浅色' : '深色'}</button>`).join('')}</div>`
  const select = container.querySelector('[data-life-style]')
  select.value = familyFor(family).id
  select.onchange = () => setFamily(select.value)
  container.querySelectorAll('[data-mode]').forEach(button => { button.onclick = () => { setMode(button.dataset.mode) } })
  applyTheme()
  if (compact) container.classList.add('compact')
}
