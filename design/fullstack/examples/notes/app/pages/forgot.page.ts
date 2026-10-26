import { definePage } from '../qc.ts'
import { forgotForm } from '../ui/auth-forms.ts'

export default definePage({
  title: '忘记密码 · 青橙全栈',
  render(_data, ctx) {
    return forgotForm({
      csrf: ctx.auth!.csrfField(ctx.session!),
      sent: ctx.url.searchParams.get('sent') === '1',
    })
  },
})
