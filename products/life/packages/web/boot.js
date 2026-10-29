(() => {
  const modes = ['system', 'light', 'dark']
  let mode = 'system'
  try { const saved = localStorage.getItem('lrds-theme'); if (modes.includes(saved)) mode = saved } catch {}
  const variants = { paper: ['paper', 'night'], retro: ['retro-paper', 'retro-crt'], cassette: ['cassette-daylight', 'cassette-amber'], atompunk: ['atompunk-chrome', 'atompunk-alert'], material: ['material-3', 'material-3-dark'], tailwind: ['tailwind-paper', 'tailwind'], carbon: ['carbon', 'carbon-night'] }
  let family = 'paper'
  try { const f = localStorage.getItem('life-style') || localStorage.getItem('manmanji-family'); if (variants[f]) family = f } catch {}
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = mode
  document.documentElement.dataset.style = variants[family][dark ? 1 : 0]
  document.documentElement.dataset.appearance = dark ? 'dark' : 'light'
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
})()
