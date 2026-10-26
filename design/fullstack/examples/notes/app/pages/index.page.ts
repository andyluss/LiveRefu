import { definePage, html } from '../qc.ts'

interface Note {
  id: number
  title: string
  body: string
  created_at: string
}

export default definePage({
  auth: 'required',
  title: 'Notes · 青橙全栈',
  load({ db, user }) {
    return {
      notes: db.query<Note>('select id, title, body, created_at from notes where user_id = ? order by id desc', [user!.id]),
    }
  },
  render({ notes }: { notes: Note[] }, ctx) {
    const csrf = ctx.auth!.csrfField(ctx.session!)
    return html`
      <h1>Notes</h1>
      <p class="muted">P2 示例：登录、CSRF、校验、个人笔记、SQLite 迁移。</p>

      <form class="card" method="post" action="/actions/notes/create">
        ${csrf}
        <div style="margin-bottom:8px"><input name="title" placeholder="标题" required maxlength="120"></div>
        <div style="margin-bottom:8px"><textarea name="body" placeholder="正文" required></textarea></div>
        <button type="submit">创建笔记</button>
      </form>

      ${notes.length === 0
        ? html`<p class="muted">还没有笔记。创建第一条。</p>`
        : notes.map(note => html`
            <article class="card">
              <h2><a href="/notes/${note.id}">${note.title}</a></h2>
              <p>${note.body.length > 120 ? note.body.slice(0, 120) + '…' : note.body}</p>
              <p class="muted">${note.created_at}</p>
            </article>
          `)}
    `
  },
})
