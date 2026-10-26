import { defineAction, redirect, object, string } from '../../qc.ts'
import { resetForm } from '../../ui/auth-forms.ts'

export default defineAction({
  errorTitle: '重置密码 · 青橙全栈',
  input: object({
    token: string({ min: 1, label: '重置令牌' }),
    password: string({ min: 8, label: '新密码' }),
  }),
  onError(ctx, error) {
    const fields = (error as any)?.fields ?? {}
    return resetForm({
      csrf: ctx.auth!.csrfField(ctx.session!),
      token: String(ctx.form?.get('token') ?? ''),
      errors: fields,
    })
  },
  handle(ctx) {
    const input = ctx.input as { token: string; password: string }
    ctx.auth!.resetPassword(input.token, input.password)
    return redirect('/login?reset=1')
  },
})
