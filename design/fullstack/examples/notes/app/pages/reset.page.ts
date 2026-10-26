import { definePage } from '../qc.ts'
import { resetForm } from '../ui/auth-forms.ts'

export default definePage({
  title: '重置密码 · 青橙全栈',
  render(_data, ctx) {
    return resetForm({
      csrf: ctx.auth!.csrfField(ctx.session!),
      token: ctx.url.searchParams.get('token') ?? '',
    })
  },
})
