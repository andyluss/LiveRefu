import { definePage, html, notFound } from '../../qc.ts'

interface Note {
  id: number
  title: string
  body: string
  created_at: string
}

export default definePage({
  title: 'Note · 青橙全栈',
  load({ db, params }) {
    const note = db.one<Note>('select id, title, body, created_at from notes where id = ?', [Number(params.id)])
    if (!note) notFound('笔记不存在')
    return { note }
  },
  render({ note }: { note: Note }) {
    return html`
      <p><a href="/">← 全部笔记</a></p>
      <article class="card">
        <h1>${note.title}</h1>
        <p>${note.body}</p>
        <p class="muted">${note.created_at}</p>
      </article>
      <form method="post" action="/actions/notes/delete">
        <input type="hidden" name="id" value="${note.id}">
        <button class="danger" type="submit">删除</button>
      </form>
    `
  },
})
