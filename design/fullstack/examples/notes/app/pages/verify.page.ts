import { definePage, html } from '../qc.ts'

export default definePage({
  title: '验证邮箱 · 青橙全栈',
  load(ctx) {
    const token = ctx.url.searchParams.get('token')
    if (!token) return { error: '缺少验证令牌' }
    try {
      return { email: ctx.auth!.verifyEmail(token) }
    } catch (error) {
      return { error: error instanceof Error ? error.message : '验证失败' }
    }
  },
  render(data: { email?: string; error?: string }) {
    return data.error
      ? html`<h1>验证失败</h1><p class="danger">${data.error}</p><p><a href="/login">返回登录</a></p>`
      : html`<h1>邮箱已验证</h1><p>${data.email} 已验证。可以继续使用。</p><p><a href="/">开始</a></p>`
  },
})
