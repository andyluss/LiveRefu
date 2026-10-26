import { definePage, html, notFound } from '../../qc.ts'

interface Note {
  id: number
  title: string
  body: string
  created_at: string
}

export default definePage({
  auth: 'required',
  title: 'Note · 青橙全栈',
  load({ db, params, user }) {
    const note = db.one<Note>('select id, title, body, created_at from notes where id = ? and user_id = ?', [Number(params.id), user!.id])
    if (!note) notFound('笔记不存在')
    return { note }
  },
  render({ note }: { note: Note }, ctx) {
    const csrf = ctx.auth!.csrfField(ctx.session!)
    return html`
      <p><a href="/">← 全部笔记</a></p>
      <article class="card">
        <h1>${note.title}</h1>
        <p>${note.body}</p>
        <p class="muted">${note.created_at}</p>
      </article>
      <form method="post" action="/actions/notes/delete">
        ${csrf}
        <input type="hidden" name="id" value="${note.id}">
        <button class="danger" type="submit">删除</button>
      </form>
    `
  },
})
