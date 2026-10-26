import { defineAction, redirect, object, string } from '../../qc.ts'
import { registerForm } from '../../ui/auth-forms.ts'

export default defineAction({
  errorTitle: '注册 · 青橙全栈',
  input: object({
    email: string({ email: true, label: '邮箱' }),
    password: string({ min: 8, label: '密码' }),
  }),
  onError(ctx, error) {
    const fields = (error as any)?.fields ?? {}
    return registerForm({
      csrf: ctx.auth!.csrfField(ctx.session!),
      email: String(ctx.form?.get('email') ?? ''),
      errors: fields,
    })
  },
  handle(ctx) {
    const ip = ctx.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    ctx.rateLimit!(`register:${ip}`, 5, 60_000)
    const input = ctx.input as { email: string; password: string }
    const result = ctx.auth!.register(input.email, input.password)
    ctx.setCookie!(result.cookie)
    return redirect('/')
  },
})
