import { defineAction, redirect, object, string } from '../../qc.ts'

export default defineAction({
  input: object({
    email: string({ email: true, label: '邮箱' }),
    password: string({ min: 8, label: '密码' }),
  }),
  handle(ctx) {
    const ip = ctx.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    ctx.rateLimit!(`register:${ip}`, 5, 60_000)
    const input = ctx.input as { email: string; password: string }
    const result = ctx.auth!.register(input.email, input.password)
    ctx.setCookie!(result.cookie)
    return redirect('/')
  },
})
