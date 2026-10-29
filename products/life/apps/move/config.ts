// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, minutesLabel, seedDate, streak, sum, weekEntries } from '../../packages/core/helpers.ts'

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
  },
  packs: [
    {
      id: 'move-body', name: '身体状态', description: '体重、静息心率、睡眠时长；看长期趋势，不做医疗诊断。',
      modules: [{
        id: 'body', name: '身体状态', entryLabel: '身体记录',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'weight', label: '体重（kg）', type: 'number', min: 20, max: 300, step: 0.1 },
          { key: 'restingHr', label: '静息心率', type: 'number', min: 30, max: 200, step: 1 },
          { key: 'sleepHours', label: '睡眠（小时）', type: 'number', min: 0, max: 24, step: 0.5 },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'weight', 'restingHr', 'sleepHours'],
        seed: [0, 2, 4, 6].map((offset, i) => ({ date: seedDate(offset), data: { weight: [68.2, 68.0, 67.8, 68.1][i]!, restingHr: [62, 60, 59, 61][i]!, sleepHours: [7.5, 7, 8, 6.5][i]!, note: ['', '', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { const recent = entries.slice(0, 14); return { metrics: [{ label: '最近体重', value: recent[0]?.data.weight ? `${recent[0].data.weight} kg` : '—', note: '最近一条' }, { label: '平均静息心率', value: recent.length ? `${Math.round(avg(recent.map(e => Number(e.data.restingHr) || 0)))}` : '—', note: '次/分' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '静息心率', values: chartOf(entries, e => Number(e.data.restingHr) || 0) }, streak: streak(entries), hint: '这些数字只用于自我观察，不构成医疗建议。' } }
      }]
    },
    {
      id: 'move-plan', name: '训练计划', description: '本周训练重点、计划分钟、是否完成。',
      modules: [{
        id: 'training-plan', name: '训练计划', entryLabel: '训练计划',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'focus', label: '重点', type: 'select', options: ['有氧', '力量', '柔韧', '恢复'], required: true },
          { key: 'minutes', label: '计划分钟', type: 'number', min: 0, max: 300, step: 5 },
          { key: 'done', label: '是否完成', type: 'select', options: ['是', '部分', '否'] },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'focus', 'minutes', 'done'],
        seed: [0, 1, 2, 4].map((offset, i) => ({ date: seedDate(offset), data: { focus: ['有氧', '力量', '柔韧', '恢复'][i]!, minutes: [40, 30, 15, 20][i]!, done: ['是', '是', '部分', '否'][i]!, note: ['', '', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { const week = weekEntries(entries); const done = week.filter(e => e.data.done === '是').length; return { metrics: [{ label: '本周计划', value: `${week.length} 次`, note: '训练安排' }, { label: '完成', value: `${done} 次`, note: '允许调整' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '计划分钟', values: chartOf(entries, e => Number(e.data.minutes) || 0) }, streak: streak(entries), hint: '计划是方向，不是罚单。' } }
      }]
    }
  ]
}
