/**
 * CRT 质感开关（D8 的"可关闭的 CRT"）。
 *
 * 默认开启；用户偏好写入 localStorage。因为要在客户端改 <html> 的属性，
 * 这里用 useState + onMounted，避免 SSR/CSR 不一致。
 */
export function useCrt() {
  const enabled = useState('crt-enabled', () => true)

  function apply(on: boolean) {
    if (import.meta.client) {
      document.documentElement.setAttribute('data-crt', on ? 'on' : 'off')
    }
  }

  function toggle() {
    enabled.value = !enabled.value
    apply(enabled.value)
    if (import.meta.client) {
      localStorage.setItem('crt', enabled.value ? 'on' : 'off')
    }
  }

  onMounted(() => {
    const saved = localStorage.getItem('crt')
    enabled.value = saved === null ? true : saved === 'on'
    apply(enabled.value)
  })

  return { enabled, toggle }
}
