import { definePage } from '../qc.ts'
import { loginForm } from '../ui/auth-forms.ts'

export default definePage({
  title: '登录 · 青橙全栈',
  render(_data, ctx) {
    return loginForm({
      csrf: ctx.auth!.csrfField(ctx.session!),
      next: ctx.url.searchParams.get('next') ?? '/',
    })
  },
})
