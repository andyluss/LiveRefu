// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { chartOf, minutesLabel, seedDate, streak, sum, weekEntries } from '../../packages/core/helpers.ts'

export const config: AppConfig = {
  id: 'home', name: '好好住', english: 'HOMEBOARD', port: 4205,
  tagline: '家不是一次性收拾完的，是一点点被照顾的。',
  description: '记录家务、维护和待办。看见已经做过的，也看见还没做的，不制造愧疚。',
  accent: '#4F6B3A', accentOn: '#FFFDF7', entryLabel: '家务',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'task', label: '做了什么', type: 'text', required: true, placeholder: '例如：清理冰箱' },
    { key: 'area', label: '区域', type: 'select', options: ['厨房', '客厅', '卧室', '浴室', '阳台', '全屋'], required: true },
    { key: 'minutes', label: '耗时（分钟）', type: 'number', min: 0, max: 600, step: 5, default: 0 },
    { key: 'dueDate', label: '下次到期', type: 'date' },
    { key: 'done', label: '状态', type: 'select', options: ['完成', '待办'], required: true },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  columns: ['date', 'task', 'area', 'done'],
  seed: [0, 1, 2, 4, 6].map((offset, i) => ({
    date: seedDate(offset),
    data: { task: ['清理冰箱', '换床单', '擦浴室', '给植物浇水', '整理书桌'][i]!, area: ['厨房', '卧室', '浴室', '阳台', '客厅'][i]!, minutes: [25, 10, 20, 5, 15][i]!, dueDate: ['', '', '', '', ''][i]!, done: ['完成', '完成', '完成', '完成', '待办'][i]!, note: ['', '', '', '', '周末做'][i]! }
  })),
  summary(entries: LifeEntry[]) {
    const week = weekEntries(entries)
    const done = week.filter(e => e.data.done === '完成')
    const pending = week.filter(e => e.data.done === '待办')
    return {
      metrics: [
        { label: '本周完成', value: `${done.length} 件`, note: '已照顾到的' },
        { label: '待办', value: `${pending.length} 件`, note: '不催你' },
        { label: '本周耗时', value: minutesLabel(sum(week.map(e => Number(e.data.minutes) || 0))), note: `${week.length} 条` }
      ],
      chart: { label: '完成任务数', values: chartOf(entries, e => e.data.done === '完成' ? 1 : 0) },
      streak: streak(entries),
      hint: '待办不是失败；它只是提醒家还在被使用。'
    }
  }
}
