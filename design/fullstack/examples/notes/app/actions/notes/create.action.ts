import { defineAction, redirect, object, string, nowIso } from '../../qc.ts'

export default defineAction({
  auth: 'required',
  input: object({
    title: string({ min: 1, max: 120, label: '标题' }),
    body: string({ min: 1, max: 10000, label: '正文' }),
  }),
  handle({ input, db, user }) {
    const data = input as { title: string; body: string }
    db.insert('notes', {
      title: data.title,
      body: data.body,
      user_id: user!.id,
      created_at: nowIso(),
    })
    return redirect('/')
  },
})
