// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { chartOf, minutesLabel, seedDate, streak, sum, weekEntries } from '../../packages/core/helpers.ts'

export const config: AppConfig = {
  id: 'move', name: '慢慢走', english: 'DAILYWALK', port: 4203,
  tagline: '不追配速，先把身体动起来。',
  description: '散步、跑步、力量、拉伸都算。记分钟和感受，不把运动变成另一份 KPI。',
  accent: '#8A3B24', accentOn: '#FFFDF7', entryLabel: '活动',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'activity', label: '活动', type: 'select', options: ['步行', '跑步', '力量', '拉伸', '骑行'], required: true },
    { key: 'minutes', label: '分钟', type: 'number', min: 1, max: 600, step: 5, required: true },
    { key: 'intensity', label: '强度', type: 'select', options: ['轻', '中', '高'], required: true },
    { key: 'mood', label: '动完心情', type: 'rating' },
    { key: 'note', label: '备注', type: 'textarea', placeholder: '例如：沿河走了一圈' }
  ],
  columns: ['date', 'activity', 'minutes', 'intensity'],
  seed: [0, 1, 2, 4, 6].map((offset, i) => ({
    date: seedDate(offset),
    data: { activity: ['步行', '拉伸', '步行', '力量', '骑行'][i]!, minutes: [35, 15, 50, 30, 45][i]!, intensity: ['轻', '轻', '中', '中', '中'][i]!, mood: [4, 5, 5, 3, 4][i]!, note: ['午饭后', '肩颈', '河边', '深蹲和俯卧撑', '公园'][i]! }
  })),
  summary(entries: LifeEntry[]) {
    const week = weekEntries(entries)
    const activeDays = new Set(week.map(e => e.date)).size
    return {
      metrics: [
        { label: '本周分钟', value: minutesLabel(sum(week.map(e => Number(e.data.minutes) || 0))), note: `${week.length} 次` },
        { label: '活动天数', value: `${activeDays} / 7`, note: '本周' },
        { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }
      ],
      chart: { label: '活动分钟', values: chartOf(entries, e => Number(e.data.minutes) || 0) },
      streak: streak(entries),
      hint: '一次 10 分钟的散步也算数；先让记录发生。'
    }
  }
}
