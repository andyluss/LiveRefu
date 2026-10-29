(() => {
  const modes = ['system', 'light', 'dark']
  let mode = 'system'
  try { const saved = localStorage.getItem('lrds-theme'); if (modes.includes(saved)) mode = saved } catch {}
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = mode
  document.documentElement.dataset.appearance = dark ? 'dark' : 'light'
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
})()
