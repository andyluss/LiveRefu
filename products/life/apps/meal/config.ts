// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, seedDate, streak, weekEntries } from '../../packages/core/helpers.ts'

export const config: AppConfig = {
  id: 'meal', name: '好好吃', english: 'MEALTIME', port: 4202,
  tagline: '不计算卡路里，只看见自己吃了什么。',
  description: '记录餐次、蔬菜和饮水，保留“吃了什么”的上下文。不做饮食审判。',
  accent: '#8A5A00', accentOn: '#FFFDF7', entryLabel: '一餐',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'meal', label: '餐次', type: 'select', options: ['早餐', '午餐', '晚餐', '加餐'], required: true },
    { key: 'food', label: '吃了什么', type: 'text', required: true, placeholder: '例如：番茄鸡蛋面' },
    { key: 'vegetables', label: '有蔬菜吗', type: 'select', options: ['有', '没有'], required: true },
    { key: 'waterMl', label: '饮水（ml）', type: 'number', min: 0, max: 5000, step: 50, default: 0 },
    { key: 'rating', label: '满足感', type: 'rating' },
    { key: 'note', label: '备注', type: 'textarea', placeholder: '例如：吃得太急' }
  ],
  columns: ['date', 'meal', 'food', 'vegetables'],
  seed: [0, 0, 1, 1, 2, 3].map((offset, i) => ({
    date: seedDate(offset),
    data: { meal: ['早餐', '午餐', '晚餐', '早餐', '午餐', '晚餐'][i]!, food: ['燕麦和咖啡', '番茄鸡蛋面', '米饭、青菜和鱼', '包子豆浆', '牛肉饭', '蔬菜汤和面包'][i]!, vegetables: ['没有', '有', '有', '没有', '有', '有'][i]!, waterMl: [300, 500, 400, 250, 600, 350][i]!, rating: [3, 4, 5, 3, 4, 4][i]!, note: ['', '', '', '', '', ''][i]! }
  })),
  summary(entries: LifeEntry[]) {
    const week = weekEntries(entries)
    const veggieDays = new Set(week.filter(e => e.data.vegetables === '有').map(e => e.date)).size
    const water = week.map(e => Number(e.data.waterMl)).filter(Boolean)
    return {
      metrics: [
        { label: '本周餐数', value: `${week.length} 餐`, note: '含加餐' },
        { label: '有蔬菜', value: `${veggieDays} 天`, note: '本周不同日期' },
        { label: '平均饮水', value: water.length ? `${Math.round(avg(water))} ml` : '—', note: '按餐记录' }
      ],
      chart: { label: '饮水（ml）', values: chartOf(entries, e => Number(e.data.waterMl) || 0) },
      streak: streak(entries),
      hint: '记录不是评分；一顿不完美也可以被记下来。'
    }
  },
  packs: [
    {
      id: 'meal-pantry', name: '食材库存', description: '家里有什么、在哪、何时过期；减少“买了又忘”。',
      modules: [{
        id: 'pantry', name: '食材库存', entryLabel: '食材',
        fields: [
          { key: 'date', label: '记录日期', type: 'date', required: true },
          { key: 'name', label: '食材', type: 'text', required: true, placeholder: '例如：鸡蛋' },
          { key: 'qty', label: '数量', type: 'number', min: 0, max: 999, step: 1 },
          { key: 'unit', label: '单位', type: 'select', options: ['个', '盒', '袋', '瓶', '克'] },
          { key: 'location', label: '位置', type: 'select', options: ['冰箱', '冷冻', '橱柜', '其它'] },
          { key: 'expires', label: '保质期', type: 'date' }
        ],
        columns: ['date', 'name', 'qty', 'expires'],
        seed: [0, 0, 1, 3].map((offset, i) => ({ date: seedDate(offset), data: { name: ['鸡蛋', '牛奶', '番茄', '米'][i]!, qty: [6, 1, 4, 2][i]!, unit: ['个', '盒', '个', '袋'][i]!, location: ['冰箱', '冰箱', '冰箱', '橱柜'][i]!, expires: [seedDate(-4), seedDate(-2), seedDate(-5), seedDate(-90)][i]! } })),
        summary(entries: LifeEntry[]) { const soon = entries.filter(e => String(e.data.expires || '') && String(e.data.expires) <= seedDate(-7) && String(e.data.expires) >= seedDate(0)); return { metrics: [{ label: '库存条目', value: `${entries.length} 项`, note: '当前记录' }, { label: '临近过期', value: `${soon.length} 项`, note: '7 天内' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '库存数量', values: chartOf(entries, e => Number(e.data.qty) || 0) }, streak: streak(entries), hint: '库存是提醒，不是采购义务。' } }
      }]
    },
    {
      id: 'meal-plan', name: '餐食计划', description: '提前安排一周的餐，和实际吃了什么对照。',
      modules: [{
        id: 'meal-plan', name: '餐食计划', entryLabel: '计划',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'meal', label: '餐次', type: 'select', options: ['早餐', '午餐', '晚餐', '加餐'], required: true },
          { key: 'plannedFood', label: '计划吃什么', type: 'text', required: true },
          { key: 'done', label: '是否执行', type: 'select', options: ['是', '部分', '否'] },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'meal', 'plannedFood', 'done'],
        seed: [0, 0, 1, 2].map((offset, i) => ({ date: seedDate(offset), data: { meal: ['早餐', '午餐', '晚餐', '早餐'][i]!, plannedFood: ['燕麦', '沙拉', '番茄鸡蛋面', '豆浆'][i]!, done: ['是', '部分', '是', '否'][i]!, note: ['', '', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { const week = weekEntries(entries); const done = week.filter(e => e.data.done === '是').length; return { metrics: [{ label: '本周计划', value: `${week.length} 餐`, note: '提前安排' }, { label: '按计划', value: `${done} 餐`, note: '不要求 100%' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '执行程度', values: chartOf(entries, e => e.data.done === '是' ? 2 : e.data.done === '部分' ? 1 : 0) }, streak: streak(entries), hint: '计划被打破也可以记录；它不是合同。' } }
      }]
    }
  ]
}
