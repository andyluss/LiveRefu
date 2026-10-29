// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, seedDate, streak } from '../../packages/core/helpers.ts'
function money(n: number) { return '¥' + n.toLocaleString('zh-CN') }
export const config: AppConfig = {
  id: 'travel', name: '好好行', english: 'TRAVELLOG', port: 4213,
  tagline: '去过哪里，和谁，留下了什么。',
  description: '记录出行和地点；地点清单、行程与纪念物作为可选扩展。',
  accent: '#3B5B8A', accentOn: '#FFFDF7', entryLabel: '出行',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'place', label: '地点', type: 'text', required: true },
    { key: 'kind', label: '类型', type: 'select', options: ['散步', '半日', '一日', '旅行'] },
    { key: 'companions', label: '同行', type: 'text' },
    { key: 'rating', label: '体验', type: 'rating' },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  columns: ['date', 'place', 'kind', 'rating'],
  seed: [0, 2, 4, 7, 10].map((offset, i) => ({ date: seedDate(offset), data: { place: ['滨江步道', '旧城书店', '植物园', '海边', '山里'][i]!, kind: ['散步', '半日', '一日', '旅行', '旅行'][i]!, companions: ['自己', '朋友', '自己', '家人', '朋友'][i]!, rating: [4, 5, 4, 5, 4][i]!, note: ['', '', '', '', ''][i]! } })),
  summary(entries: LifeEntry[]) {
    return { metrics: [{ label: '出行', value: `${entries.length} 次`, note: '全部' }, { label: '平均体验', value: entries.length ? `${avg(entries.map(e => Number(e.data.rating) || 0)).toFixed(1)} / 5` : '—', note: '主观' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '出行体验', values: chartOf(entries, e => Number(e.data.rating) || 0) }, streak: streak(entries), hint: '远近不重要；离开日常就算。' }
  },
  packs: [
    { id: 'travel-places', name: '地点清单', description: '想去/去过的地方；不让念头消失。', modules: [{
      id: 'places', name: '地点清单', entryLabel: '地点',
      fields: [
        { key: 'date', label: '加入日期', type: 'date', required: true },
        { key: 'name', label: '地点', type: 'text', required: true },
        { key: 'city', label: '城市', type: 'text' },
        { key: 'category', label: '类别', type: 'select', options: ['自然', '街区', '书店', '展览', '餐馆', '其它'] },
        { key: 'status', label: '状态', type: 'select', options: ['想去', '去过', '放弃'] },
        { key: 'note', label: '备注', type: 'textarea' }
      ],
      columns: ['date', 'name', 'city', 'status'],
      seed: [5, 20, 40].map((offset, i) => ({ date: seedDate(offset), data: { name: ['海边栈道', '旧城书店', '山里的咖啡馆'][i]!, city: ['本地', '本地', '邻城'][i]!, category: ['自然', '书店', '餐馆'][i]!, status: ['去过', '想去', '想去'][i]!, note: ['', '', ''][i]! } })),
      summary(entries: LifeEntry[]) {
        return { metrics: [{ label: '地点', value: `${entries.length} 个`, note: '全部' }, { label: '想去', value: `${entries.filter(e => e.data.status === '想去').length} 个`, note: '不催' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '地点条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '清单是邀请，不是任务。' }
      }
    }] },
    { id: 'travel-trips', name: '行程', description: '一次出行的起止、预算和状态。', modules: [{
      id: 'trips', name: '行程', entryLabel: '行程',
      fields: [
        { key: 'date', label: '开始日期', type: 'date', required: true },
        { key: 'name', label: '行程名', type: 'text', required: true },
        { key: 'endDate', label: '结束日期', type: 'date' },
        { key: 'budget', label: '预算（元）', type: 'number', min: 0, max: 100000, step: 100 },
        { key: 'status', label: '状态', type: 'select', options: ['计划', '进行', '完成', '取消'] },
        { key: 'note', label: '备注', type: 'textarea' }
      ],
      columns: ['date', 'name', 'endDate', 'status'],
      seed: [10, 60].map((offset, i) => ({ date: seedDate(offset), data: { name: ['周末海边', '秋天山里'][i]!, endDate: [seedDate(offset - 2), seedDate(offset - 5)][i]!, budget: [800, 3000][i]!, status: ['完成', '计划'][i]!, note: ['', ''][i]! } })),
      summary(entries: LifeEntry[]) {
        const budget = entries.reduce((s, e) => s + Number(e.data.budget || 0), 0)
        return { metrics: [{ label: '行程', value: `${entries.length} 次`, note: '全部' }, { label: '预算合计', value: money(budget), note: '参考' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '行程条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '预算是边界，不是消费任务。' }
      }
    }] },
    { id: 'travel-souvenirs', name: '纪念物', description: '带回来的小东西、来源和价格；留住故事。', modules: [{
      id: 'souvenirs', name: '纪念物', entryLabel: '纪念物',
      fields: [
        { key: 'date', label: '日期', type: 'date', required: true },
        { key: 'item', label: '物品', type: 'text', required: true },
        { key: 'place', label: '来自', type: 'text' },
        { key: 'price', label: '价格（元）', type: 'number', min: 0, max: 100000, step: 1 },
        { key: 'note', label: '故事', type: 'textarea' }
      ],
      columns: ['date', 'item', 'place', 'price'],
      seed: [2, 30].map((offset, i) => ({ date: seedDate(offset), data: { item: ['海边石头', '旧书'][i]!, place: ['海边', '旧城书店'][i]!, price: [0, 45][i]!, note: ['', ''][i]! } })),
      summary(entries: LifeEntry[]) {
        return { metrics: [{ label: '纪念物', value: `${entries.length} 件`, note: '全部' }, { label: '花费', value: money(entries.reduce((s, e) => s + Number(e.data.price || 0), 0)), note: '参考' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '纪念物条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '纪念物不是购物战利品；它应该有一个故事。' }
      }
    }] }
  ]
}
