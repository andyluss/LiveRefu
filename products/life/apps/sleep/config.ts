// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, durationMinutes, lastDays, minutesLabel, seedDate, streak } from '../../packages/core/helpers.ts'

export const config: AppConfig = {
  id: 'sleep', name: '好好睡', english: 'SLEEPWELL', port: 4201,
  tagline: '把睡眠记下来，才知道什么真的影响它。',
  description: '只记入睡、醒来、质量和两个常见干扰。两周后回看，比“感觉没睡好”更有用。',
  accent: '#0F6B63', accentOn: '#FFFDF7', entryLabel: '睡眠记录',
  fields: [
    { key: 'date', label: '醒来日期', type: 'date', required: true },
    { key: 'sleepAt', label: '入睡时间', type: 'time', required: true },
    { key: 'wakeAt', label: '醒来时间', type: 'time', required: true },
    { key: 'quality', label: '睡眠质量', type: 'rating', required: true },
    { key: 'caffeine', label: '咖啡因（杯）', type: 'number', min: 0, max: 10, step: 1, default: 0 },
    { key: 'screenMinutes', label: '睡前屏幕（分钟）', type: 'number', min: 0, max: 600, step: 10, default: 0 },
    { key: 'note', label: '备注', type: 'textarea', placeholder: '例如：半夜醒了两次' }
  ],
  columns: ['date', 'sleepAt', 'wakeAt', 'quality'],
  seed: [0, 1, 2, 3, 5].map((offset, i) => ({
    date: seedDate(offset),
    data: { sleepAt: ['23:20', '00:10', '23:50', '22:50', '00:40'][i]!, wakeAt: ['07:10', '07:30', '06:50', '07:20', '08:10'][i]!, quality: [4, 3, 4, 5, 2][i]!, caffeine: [1, 2, 1, 0, 3][i]!, screenMinutes: [30, 90, 20, 0, 120][i]!, note: ['', '睡前刷手机', '', '周末补觉', '下午咖啡太晚'][i]! }
  })),
  summary(entries: LifeEntry[]) {
    const days = lastDays(14)
    const recent = entries.filter(e => days.includes(e.date))
    const durations = recent.map(e => durationMinutes(String(e.data.sleepAt || ''), String(e.data.wakeAt || ''))).filter(Boolean)
    const quality = recent.map(e => Number(e.data.quality)).filter(Boolean)
    const chart = chartOf(entries, e => durationMinutes(String(e.data.sleepAt || ''), String(e.data.wakeAt || '')))
    return {
      metrics: [
        { label: '平均睡眠', value: durations.length ? minutesLabel(avg(durations)) : '—', note: `${recent.length} 晚记录` },
        { label: '平均质量', value: quality.length ? `${avg(quality).toFixed(1)} / 5` : '—', note: '主观评分' },
        { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }
      ],
      chart: { label: '睡眠时长（分钟）', values: chart },
      streak: streak(entries),
      hint: '睡眠时长按时钟差计算；跨午夜自动 +24h。'
    }
  }
}
