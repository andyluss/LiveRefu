// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, seedDate, streak, monthEntries, weekEntries } from '../../packages/core/helpers.ts'
export const config: AppConfig = {
  id: 'watch', name: '好好看', english: 'WATCHLOG', port: 4210,
  tagline: '看过什么，比看了多少更重要。',
  description: '记录电影/剧集、评分和平台；片单、影院体验和剧集进度作为可选扩展。',
  accent: '#6B4F8A', accentOn: '#FFFDF7', entryLabel: '看过的',
  fields: [
    { key: 'date', label: '观看日期', type: 'date', required: true },
    { key: 'title', label: '片名/剧名', type: 'text', required: true },
    { key: 'kind', label: '类型', type: 'select', options: ['电影', '剧集', '纪录片', '短片'], required: true },
    { key: 'rating', label: '评分', type: 'rating' },
    { key: 'platform', label: '平台', type: 'text', placeholder: '影院 / 流媒体 / 电视' },
    { key: 'note', label: '观后感', type: 'textarea' }
  ],
  columns: ['date', 'title', 'kind', 'rating'],
  seed: [0, 2, 3, 5, 8].map((offset, i) => ({ date: seedDate(offset), data: { title: ['花样年华', '驾驶我的车', '地球脉动', '瞬息全宇宙', '蓝色时期'][i]!, kind: ['电影', '电影', '纪录片', '电影', '剧集'][i]!, rating: [5, 4, 5, 4, 3][i]!, platform: ['影院', '流媒体', '电视', '流媒体', '流媒体'][i]!, note: ['', '安静', '', '', ''][i]! } })),
  summary(entries: LifeEntry[]) {
    const month = monthEntries(entries)
    return { metrics: [{ label: '本月观看', value: `${month.length} 部`, note: '含剧集' }, { label: '平均评分', value: month.length ? `${avg(month.map(e => Number(e.data.rating) || 0)).toFixed(1)} / 5` : '—', note: '主观' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '评分', values: chartOf(entries, e => Number(e.data.rating) || 0) }, streak: streak(entries), hint: '评分只是当时的感受，不是影评。' }
  },
  packs: [
    { id: 'watch-watchlist', name: '片单', description: '想看什么、为什么、优先级；不丢失想看的念头。', modules: [{ id: 'watchlist', name: '片单', entryLabel: '想看', fields: [
      { key: 'date', label: '加入日期', type: 'date', required: true }, { key: 'title', label: '片名', type: 'text', required: true }, { key: 'kind', label: '类型', type: 'select', options: ['电影', '剧集', '纪录片', '短片'] }, { key: 'priority', label: '优先级', type: 'select', options: ['低', '中', '高'] }, { key: 'platform', label: '在哪看', type: 'text' }, { key: 'status', label: '状态', type: 'select', options: ['想看', '已看', '放弃'] }
    ], columns: ['date', 'title', 'priority', 'status'], seed: [2, 10, 30].map((offset, i) => ({ date: seedDate(offset), data: { title: ['悲情城市', '漫长的季节', '海洋'][i]!, kind: ['电影', '剧集', '纪录片'][i]!, priority: ['高', '中', '低'][i]!, platform: ['影院', '流媒体', '电视'][i]!, status: ['想看', '想看', '放弃'][i]! } })), summary(entries: LifeEntry[]) { return { metrics: [{ label: '片单', value: `${entries.length} 部`, note: '全部' }, { label: '还想看', value: `${entries.filter(e => e.data.status === '想看').length} 部`, note: '不催' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '片单条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '片单是愿望，不是待办。' } } }] },
    { id: 'watch-cinema', name: '影院', description: '影院/场所、同伴和体验；保留看电影的现场感。', modules: [{ id: 'cinema', name: '影院', entryLabel: '影院体验', fields: [
      { key: 'date', label: '日期', type: 'date', required: true }, { key: 'title', label: '片名', type: 'text', required: true }, { key: 'venue', label: '影院', type: 'text' }, { key: 'companions', label: '同伴', type: 'text' }, { key: 'rating', label: '体验', type: 'rating' }, { key: 'note', label: '备注', type: 'textarea' }
    ], columns: ['date', 'title', 'venue', 'rating'], seed: [5, 20].map((offset, i) => ({ date: seedDate(offset), data: { title: ['花样年华', '沙丘'][i]!, venue: ['老影院', 'IMAX'][i]!, companions: ['自己', '朋友'][i]!, rating: [5, 4][i]!, note: ['', ''][i]! } })), summary(entries: LifeEntry[]) { return { metrics: [{ label: '影院', value: `${entries.length} 次`, note: '累计' }, { label: '平均体验', value: entries.length ? `${avg(entries.map(e => Number(e.data.rating) || 0)).toFixed(1)} / 5` : '—', note: '主观' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '体验评分', values: chartOf(entries, e => Number(e.data.rating) || 0) }, streak: streak(entries), hint: '现场感也是内容的一部分。' } } }] },
    { id: 'watch-series', name: '剧集进度', description: '季/集进度和状态；避免忘记看到哪。', modules: [{ id: 'series', name: '剧集进度', entryLabel: '剧集', fields: [
      { key: 'date', label: '更新日期', type: 'date', required: true }, { key: 'title', label: '剧名', type: 'text', required: true }, { key: 'season', label: '季', type: 'number', min: 1, max: 50, step: 1 }, { key: 'episode', label: '集', type: 'number', min: 1, max: 500, step: 1 }, { key: 'status', label: '状态', type: 'select', options: ['在看', '暂停', '看完', '弃剧'] }, { key: 'note', label: '备注', type: 'textarea' }
    ], columns: ['date', 'title', 'season', 'episode'], seed: [0, 3, 12].map((offset, i) => ({ date: seedDate(offset), data: { title: ['漫长的季节', '蓝色时期', '地球脉动'][i]!, season: [1, 1, 2][i]!, episode: [6, 4, 3][i]!, status: ['在看', '暂停', '看完'][i]!, note: ['', '', ''][i]! } })), summary(entries: LifeEntry[]) { return { metrics: [{ label: '剧集', value: `${entries.length} 部`, note: '进度' }, { label: '在看', value: `${entries.filter(e => e.data.status === '在看').length} 部`, note: '当前' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '剧集条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '暂停/弃剧都正常。' } } }] }
  ]
}
