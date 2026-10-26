import { defineAction, redirect, object, string, unauthorized } from '../../qc.ts'
import { loginForm } from '../../ui/auth-forms.ts'

function safeNext(value: unknown): string {
  const next = String(value ?? '/')
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export default defineAction({
  errorTitle: '登录 · 青橙全栈',
  input: object({
    email: string({ email: true, label: '邮箱' }),
    password: string({ min: 8, label: '密码' }),
  }),
  onError(ctx, error) {
    const fields = (error as any)?.fields ?? {}
    return loginForm({
      csrf: ctx.auth!.csrfField(ctx.session!),
      email: String(ctx.form?.get('email') ?? ''),
      errors: fields,
      next: String(ctx.form?.get('next') ?? '/'),
    })
  },
  handle(ctx) {
    const ip = ctx.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    ctx.rateLimit!(`login:${ip}`, 5, 60_000)
    const input = ctx.input as { email: string; password: string }
    let result
    try {
      result = ctx.auth!.login(input.email, input.password)
    } catch {
      throw unauthorized('邮箱或密码错误')
    }
    ctx.setCookie!(result.cookie)
    return redirect(safeNext(ctx.form?.get('next')))
  },
})
