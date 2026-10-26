import { defineAction, redirect, badRequest, nowIso } from '../../qc.ts'

export default defineAction({
  handle({ form, db }) {
    const title = String(form?.get('title') ?? '').trim()
    const url = String(form?.get('url') ?? '').trim()
    if (!title) throw badRequest('标题不能为空')
    if (!/^https?:\/\//.test(url)) throw badRequest('URL 必须以 http(s) 开头')
    db.insert('bookmarks', { title, url, created_at: nowIso() })
    return redirect('/')
  },
})
