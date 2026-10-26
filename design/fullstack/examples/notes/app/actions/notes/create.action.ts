import { defineAction, redirect, badRequest, nowIso } from '../../qc.ts'

export default defineAction({
  handle({ form, db }) {
    const title = String(form?.get('title') ?? '').trim()
    const body = String(form?.get('body') ?? '').trim()
    if (!title) throw badRequest('标题不能为空')
    if (!body) throw badRequest('正文不能为空')
    db.insert('notes', {
      title,
      body,
      created_at: nowIso(),
    })
    return redirect('/')
  },
})
