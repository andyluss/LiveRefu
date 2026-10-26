import { definePage, html } from '../qc.ts'

interface Message { id: number; name: string; body: string; created_at: string }

export default definePage({
  title: 'Guestbook · 青橙全栈',
  load({ db }) {
    return { rows: db.query<Message>('select id, name, body, created_at from messages order by id desc') }
  },
  render({ rows }: { rows: Message[] }) {
    return html`
      <form class="card" method="post" action="/actions/messages/create">
        <div style="margin-bottom:8px"><input name="name" placeholder="你的名字" required maxlength="40"></div>
        <div style="margin-bottom:8px"><textarea name="body" placeholder="留言" required maxlength="2000"></textarea></div>
        <button type="submit">留言</button>
      </form>
      ${rows.length === 0 ? html`<p class="muted">还没有留言。</p>` : rows.map(row => html`
        <article class="card"><strong>${row.name}</strong><p>${row.body}</p><p class="muted">${row.created_at}</p></article>
      `)}
    `
  },
})
