import { html, type SafeHtml } from '../qc.ts'

type Errors = Record<string, string>

function errorLine(errors: Errors, key: string): SafeHtml | string {
  return errors[key] ? html`<p class="danger" role="alert">${errors[key]}</p>` : ''
}

export function loginForm(input: { csrf: SafeHtml; email?: string; errors?: Errors; next?: string }): SafeHtml {
  const errors = input.errors ?? {}
  return html`
    <h1>登录</h1>
    <p class="muted">P2 示例：session cookie + scrypt 密码 + CSRF。</p>
    ${errorLine(errors, '_')}
    <form class="card" method="post" action="/actions/auth/login">
      ${input.csrf}
      <input type="hidden" name="next" value="${input.next ?? '/'}">
      <label for="login-email">邮箱</label>
      <input id="login-email" name="email" type="email" value="${input.email ?? ''}" required autocomplete="email" aria-invalid="${Boolean(errors.email)}">
      ${errorLine(errors, 'email')}
      <label for="login-password">密码</label>
      <input id="login-password" name="password" type="password" required autocomplete="current-password" aria-invalid="${Boolean(errors.password)}">
      ${errorLine(errors, 'password')}
      <button type="submit">登录</button>
    </form>
    <p class="muted">还没有账号？<a href="/register">注册</a> ｜ <a href="/forgot">忘记密码</a></p>
  `
}

export function registerForm(input: { csrf: SafeHtml; email?: string; errors?: Errors }): SafeHtml {
  const errors = input.errors ?? {}
  return html`
    <h1>注册</h1>
    <p class="muted">密码至少 8 位；注册后自动登录。</p>
    ${errorLine(errors, '_')}
    <form class="card" method="post" action="/actions/auth/register">
      ${input.csrf}
      <label for="register-email">邮箱</label>
      <input id="register-email" name="email" type="email" value="${input.email ?? ''}" required autocomplete="email" aria-invalid="${Boolean(errors.email)}">
      ${errorLine(errors, 'email')}
      <label for="register-password">密码（至少 8 位）</label>
      <input id="register-password" name="password" type="password" required minlength="8" autocomplete="new-password" aria-invalid="${Boolean(errors.password)}">
      ${errorLine(errors, 'password')}
      <button type="submit">创建账号</button>
    </form>
    <p class="muted">已有账号？<a href="/login">登录</a></p>
  `
}

export function forgotForm(input: { csrf: SafeHtml; email?: string; errors?: Errors; sent?: boolean }): SafeHtml {
  const errors = input.errors ?? {}
  return html`
    <h1>忘记密码</h1>
    ${input.sent ? html`<p class="card">如果邮箱存在，重置链接已发送。检查控制台/邮件。</p>` : ''}
    ${errorLine(errors, '_')}
    <form class="card" method="post" action="/actions/auth/forgot">
      ${input.csrf}
      <label for="forgot-email">邮箱</label>
      <input id="forgot-email" name="email" type="email" value="${input.email ?? ''}" required autocomplete="email" aria-invalid="${Boolean(errors.email)}">
      ${errorLine(errors, 'email')}
      <button type="submit">发送重置链接</button>
    </form>
    <p class="muted"><a href="/login">返回登录</a></p>
  `
}

export function resetForm(input: { csrf: SafeHtml; token: string; errors?: Errors }): SafeHtml {
  const errors = input.errors ?? {}
  return html`
    <h1>重置密码</h1>
    ${errorLine(errors, '_')}
    <form class="card" method="post" action="/actions/auth/reset">
      ${input.csrf}
      <input type="hidden" name="token" value="${input.token}">
      <label for="reset-password">新密码（至少 8 位）</label>
      <input id="reset-password" name="password" type="password" required minlength="8" autocomplete="new-password" aria-invalid="${Boolean(errors.password)}">
      ${errorLine(errors, 'password')}
      <button type="submit">更新密码</button>
    </form>
    <p class="muted"><a href="/login">返回登录</a></p>
  `
}
