import { defineAction, redirect, badRequest } from '../../qc.ts'

export default defineAction({
  handle({ form, db }) {
    const id = Number(form?.get('id'))
    if (!Number.isInteger(id) || id <= 0) throw badRequest('无效的笔记 id')
    db.run('delete from notes where id = ?', [id])
    return redirect('/')
  },
})
