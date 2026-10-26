import { defineAction, redirect } from '../../qc.ts'

export default defineAction({
  auth: 'required',
  handle(ctx) {
    ctx.setCookie!(ctx.auth!.logout(ctx.session!))
    return redirect('/login')
  },
})
