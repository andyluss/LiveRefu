// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { chartOf, monthEntries, seedDate, streak, sum } from '../../packages/core/helpers.ts'

export const config: AppConfig = {
  id: 'read', name: '好好读', english: 'READINGLOG', port: 4204,
  tagline: '读了多少不重要，留下哪一句更重要。',
  description: '记录书、页数、分钟和摘录。页数是进度，摘录是为什么值得读。',
  accent: '#3B5B8A', accentOn: '#FFFDF7', entryLabel: '阅读',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'book', label: '书名', type: 'text', required: true, placeholder: '例如：献给阿尔吉侬的花束' },
    { key: 'pages', label: '页数', type: 'number', min: 0, max: 2000, step: 1, default: 0 },
    { key: 'minutes', label: '分钟', type: 'number', min: 0, max: 600, step: 5, default: 0 },
    { key: 'quote', label: '摘录', type: 'textarea', placeholder: '值得留下的一句' },
    { key: 'note', label: '想法', type: 'textarea' }
  ],
  columns: ['date', 'book', 'pages', 'minutes'],
  seed: [0, 1, 2, 4, 6].map((offset, i) => ({
    date: seedDate(offset),
    data: { book: ['献给阿尔吉侬的花束', '献给阿尔吉侬的花束', '设计中的设计', '设计中的设计', '夜航西飞'][i]!, pages: [24, 31, 18, 22, 16][i]!, minutes: [35, 40, 25, 30, 20][i]!, quote: ['', '智慧离我而去时，我仍想被当作一个人。', '', '设计不是制造新奇，而是重新看见日常。', ''][i]!, note: ['', '', '', '', '开篇很好'][i]! }
  })),
  summary(entries: LifeEntry[]) {
    const month = monthEntries(entries)
    const books = new Set(month.map(e => String(e.data.book || '')).filter(Boolean)).size
    return {
      metrics: [
        { label: '本月页数', value: `${sum(month.map(e => Number(e.data.pages) || 0))}`, note: `${month.length} 次记录` },
        { label: '本月分钟', value: `${sum(month.map(e => Number(e.data.minutes) || 0))}`, note: `${books} 本书` },
        { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }
      ],
      chart: { label: '阅读页数', values: chartOf(entries, e => Number(e.data.pages) || 0) },
      streak: streak(entries),
      hint: '允许一本书读很久；记录不是读完的证明。'
    }
  }
}
