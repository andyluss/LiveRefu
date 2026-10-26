import { definePage, html } from '../qc.ts'

export default definePage({
  title: '登录 · 青橙全栈',
  render(_data, ctx) {
    const csrf = ctx.auth!.csrfField(ctx.session!)
    const next = ctx.url.searchParams.get('next') ?? '/'
    return html`
      <h1>登录</h1>
      <p class="muted">P2 示例：session cookie + scrypt 密码 + CSRF。</p>
      <form class="card" method="post" action="/actions/auth/login">
        ${csrf}
        <input type="hidden" name="next" value="${next}">
        <div style="margin-bottom:8px"><input name="email" type="email" placeholder="邮箱" required autocomplete="email"></div>
        <div style="margin-bottom:8px"><input name="password" type="password" placeholder="密码" required autocomplete="current-password"></div>
        <button type="submit">登录</button>
      </form>
      <p class="muted">还没有账号？<a href="/register">注册</a></p>
    `
  },
})
