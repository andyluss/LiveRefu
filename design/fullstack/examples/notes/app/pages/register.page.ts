import { definePage } from '../qc.ts'
import { registerForm } from '../ui/auth-forms.ts'

export default definePage({
  title: '注册 · 青橙全栈',
  render(_data, ctx) {
    return registerForm({ csrf: ctx.auth!.csrfField(ctx.session!) })
  },
})
