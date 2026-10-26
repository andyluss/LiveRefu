import { defineAction, redirect, badRequest, notFound } from '../../qc.ts'

export default defineAction({
  auth: 'required',
  handle({ form, db, user }) {
    const id = Number(form?.get('id'))
    if (!Number.isInteger(id) || id <= 0) throw badRequest('无效的笔记 id')
    const result = db.run('delete from notes where id = ? and user_id = ?', [id, user!.id])
    if (!result.changes) notFound('笔记不存在')
    return redirect('/')
  },
})
