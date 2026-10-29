// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, durationMinutes, lastDays, minutesLabel, seedDate, streak, sum, weekEntries } from '../../packages/core/helpers.ts'

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
  },
  packs: [
    {
      id: 'sleep-environment', name: '睡眠环境', description: '温度、光线、噪音和床铺舒适度；找到“睡不好”的环境线索。',
      modules: [{
        id: 'environment', name: '环境记录', entryLabel: '环境记录',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'tempC', label: '卧室温度（°C）', type: 'number', min: 10, max: 35, step: 0.5 },
          { key: 'light', label: '光线', type: 'select', options: ['很暗', '微弱', '偏亮'] },
          { key: 'noise', label: '噪音', type: 'select', options: ['安静', '轻微', '明显'] },
          { key: 'comfort', label: '床铺舒适度', type: 'rating' },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'tempC', 'light', 'comfort'],
        seed: [0, 1, 2, 4].map((offset, i) => ({ date: seedDate(offset), data: { tempC: [21, 22, 20, 23][i]!, light: ['很暗', '微弱', '很暗', '偏亮'][i]!, noise: ['安静', '轻微', '安静', '明显'][i]!, comfort: [4, 3, 5, 2][i]!, note: ['', '', '', '楼上装修'][i]! } })),
        summary(entries: LifeEntry[]) { const recent = entries.filter(e => lastDays(14).includes(e.date)); const temps = recent.map(e => Number(e.data.tempC)).filter(n => Number.isFinite(n)); return { metrics: [{ label: '平均温度', value: temps.length ? `${avg(temps).toFixed(1)}°C` : '—', note: `${recent.length} 次记录` }, { label: '平均舒适', value: recent.length ? `${avg(recent.map(e => Number(e.data.comfort) || 0)).toFixed(1)} / 5` : '—', note: '主观' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '床铺舒适度', values: chartOf(entries, e => Number(e.data.comfort) || 0) }, streak: streak(entries), hint: '环境是线索，不是诊断。' } }
      }]
    },
    {
      id: 'sleep-routine', name: '睡前程序', description: '入睡前放松、咖啡因截止、屏幕截止；记录程序是否被遵守。',
      modules: [{
        id: 'routine', name: '睡前程序', entryLabel: '程序记录',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'windDown', label: '放松时间（分钟）', type: 'number', min: 0, max: 240, step: 5 },
          { key: 'caffeineCutoff', label: '咖啡因截止', type: 'time' },
          { key: 'screenCutoff', label: '屏幕截止', type: 'time' },
          { key: 'followed', label: '是否遵守', type: 'select', options: ['是', '部分', '否'] },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'windDown', 'screenCutoff', 'followed'],
        seed: [0, 1, 2, 4].map((offset, i) => ({ date: seedDate(offset), data: { windDown: [30, 15, 40, 0][i]!, caffeineCutoff: ['14:00', '15:00', '14:00', '16:00'][i]!, screenCutoff: ['22:00', '23:00', '21:30', '23:30'][i]!, followed: ['是', '部分', '是', '否'][i]!, note: ['', '', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { const week = weekEntries(entries); const followed = week.filter(e => e.data.followed === '是').length; return { metrics: [{ label: '本周遵守', value: `${followed} 天`, note: `${week.length} 次记录` }, { label: '平均放松', value: week.length ? `${Math.round(avg(week.map(e => Number(e.data.windDown) || 0)))} 分钟` : '—', note: '睡前' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '遵守程度', values: chartOf(entries, e => e.data.followed === '是' ? 2 : e.data.followed === '部分' ? 1 : 0) }, streak: streak(entries), hint: '程序用来降低入睡阻力，不是新的考核。' } }
      }]
    }
  ]
}
