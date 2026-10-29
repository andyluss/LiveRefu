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
  },
  packs: [
    {
      id: 'read-library', name: '书库', description: '书名、作者、状态、总页数；管理在读/想读/读完。',
      modules: [{
        id: 'books', name: '书库', entryLabel: '一本书',
        fields: [
          { key: 'date', label: '加入日期', type: 'date', required: true },
          { key: 'title', label: '书名', type: 'text', required: true },
          { key: 'author', label: '作者', type: 'text' },
          { key: 'status', label: '状态', type: 'select', options: ['想读', '在读', '读完', '搁置'] },
          { key: 'totalPages', label: '总页数', type: 'number', min: 0, max: 10000, step: 1 },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'title', 'author', 'status'],
        seed: [2, 5, 10].map((offset, i) => ({ date: seedDate(offset), data: { title: ['献给阿尔吉侬的花束', '设计中的设计', '夜航西飞'][i]!, author: ['丹尼尔·凯斯', '原研哉', '柏瑞尔·马卡姆'][i]!, status: ['在读', '读完', '想读'][i]!, totalPages: [320, 280, 240][i]!, note: ['', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { const reading = entries.filter(e => e.data.status === '在读').length; const done = entries.filter(e => e.data.status === '读完').length; return { metrics: [{ label: '书库', value: `${entries.length} 本`, note: '全部' }, { label: '在读', value: `${reading} 本`, note: '慢慢来' }, { label: '读完', value: `${done} 本`, note: '累计' }], chart: { label: '书库条目', values: chartOf(entries, () => 1) }, hint: '书库不是待办清单；读不完也可以留着。' } }
      }]
    },
    {
      id: 'read-quotes', name: '摘录', description: '日期、书、页、摘录；把“值得留下的一句”独立保存。',
      modules: [{
        id: 'quotes', name: '摘录', entryLabel: '摘录',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'book', label: '书名', type: 'text', required: true },
          { key: 'page', label: '页码', type: 'number', min: 0, max: 10000, step: 1 },
          { key: 'quote', label: '摘录', type: 'textarea', required: true },
          { key: 'note', label: '想法', type: 'textarea' }
        ],
        columns: ['date', 'book', 'page'],
        seed: [0, 2, 5].map((offset, i) => ({ date: seedDate(offset), data: { book: ['献给阿尔吉侬的花束', '设计中的设计', '夜航西飞'][i]!, page: [42, 88, 12][i]!, quote: ['智慧离我而去时，我仍想被当作一个人。', '设计不是制造新奇，而是重新看见日常。', '我学会了不再害怕孤独。'][i]!, note: ['', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { return { metrics: [{ label: '摘录', value: `${entries.length} 条`, note: '值得留下' }, { label: '本月', value: `${monthEntries(entries).length} 条`, note: '持续积累' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '摘录条数', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '摘录是长期资产，不追求数量。' } }
      }]
    }
  ]
}
