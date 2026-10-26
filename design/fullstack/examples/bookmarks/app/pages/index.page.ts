import { definePage, html } from '../qc.ts'

interface Bookmark { id: number; title: string; url: string; created_at: string }

export default definePage({
  title: 'Bookmarks · 青橙全栈',
  load({ db }) {
    return { rows: db.query<Bookmark>('select id, title, url, created_at from bookmarks order by id desc') }
  },
  render({ rows }: { rows: Bookmark[] }) {
    return html`
      <form class="card" method="post" action="/actions/bookmarks/create">
        <div style="margin-bottom:8px"><input name="title" placeholder="标题" required maxlength="120"></div>
        <div style="margin-bottom:8px"><input name="url" type="url" placeholder="https://example.com" required></div>
        <button type="submit">添加书签</button>
      </form>
      ${rows.length === 0 ? html`<p class="muted">还没有书签。</p>` : rows.map(row => html`
        <article class="card"><h2>${row.title}</h2><p><a href="${row.url}" rel="noreferrer">${row.url}</a></p><p class="muted">${row.created_at}</p></article>
      `)}
    `
  },
})
