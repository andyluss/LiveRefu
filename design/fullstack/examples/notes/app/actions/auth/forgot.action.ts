import { defineAction, redirect, object, string } from '../../qc.ts'
import { forgotForm } from '../../ui/auth-forms.ts'

export default defineAction({
  errorTitle: '忘记密码 · 青橙全栈',
  input: object({
    email: string({ email: true, label: '邮箱' }),
  }),
  async onError(ctx, error) {
    const fields = (error as any)?.fields ?? {}
    return forgotForm({
      csrf: ctx.auth!.csrfField(ctx.session!),
      email: String(ctx.form?.get('email') ?? ''),
      errors: fields,
    })
  },
  async handle(ctx) {
    const input = ctx.input as { email: string }
    await ctx.auth!.requestPasswordReset(input.email, ctx.url.origin)
    return redirect('/forgot?sent=1')
  },
})
