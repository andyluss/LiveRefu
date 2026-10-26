import { definePage, html } from '../qc.ts'

export default definePage({
  title: '注册 · 青橙全栈',
  render(_data, ctx) {
    const csrf = ctx.auth!.csrfField(ctx.session!)
    return html`
      <h1>注册</h1>
      <p class="muted">密码至少 8 位；注册后自动登录。</p>
      <form class="card" method="post" action="/actions/auth/register">
        ${csrf}
        <div style="margin-bottom:8px"><input name="email" type="email" placeholder="邮箱" required autocomplete="email"></div>
        <div style="margin-bottom:8px"><input name="password" type="password" placeholder="密码（至少 8 位）" required minlength="8" autocomplete="new-password"></div>
        <button type="submit">创建账号</button>
      </form>
      <p class="muted">已有账号？<a href="/login">登录</a></p>
    `
  },
})
