import { defineAction, redirect, object, string, unauthorized } from '../../qc.ts'

function safeNext(value: unknown): string {
  const next = String(value ?? '/')
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export default defineAction({
  input: object({
    email: string({ email: true, label: '邮箱' }),
    password: string({ min: 8, label: '密码' }),
  }),
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
