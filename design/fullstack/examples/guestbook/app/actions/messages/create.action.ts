import { defineAction, redirect, badRequest, nowIso } from '../../qc.ts'

export default defineAction({
  handle({ form, db }) {
    const name = String(form?.get('name') ?? '').trim()
    const body = String(form?.get('body') ?? '').trim()
    if (!name) throw badRequest('名字不能为空')
    if (!body) throw badRequest('留言不能为空')
    db.insert('messages', { name, body, created_at: nowIso() })
    return redirect('/')
  },
})
