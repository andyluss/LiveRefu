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
  }
}
