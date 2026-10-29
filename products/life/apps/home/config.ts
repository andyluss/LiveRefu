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
  },
  packs: [
    {
      id: 'home-inventory', name: '家庭物品', description: '物品、房间、购买日、保修到期；避免“忘了买过什么”。',
      modules: [{
        id: 'items', name: '家庭物品', entryLabel: '物品',
        fields: [
          { key: 'date', label: '登记日期', type: 'date', required: true },
          { key: 'name', label: '物品', type: 'text', required: true },
          { key: 'room', label: '房间', type: 'select', options: ['厨房', '客厅', '卧室', '浴室', '阳台', '其它'] },
          { key: 'purchased', label: '购买日期', type: 'date' },
          { key: 'warrantyUntil', label: '保修到期', type: 'date' },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'name', 'room', 'warrantyUntil'],
        seed: [5, 20, 60].map((offset, i) => ({ date: seedDate(offset), data: { name: ['咖啡机', '吸尘器', '台灯'][i]!, room: ['厨房', '客厅', '卧室'][i]!, purchased: [seedDate(offset), seedDate(offset), seedDate(offset)][i]!, warrantyUntil: [seedDate(-300), seedDate(-200), seedDate(-100)][i]!, note: ['', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { const expiring = entries.filter(e => String(e.data.warrantyUntil || '') && String(e.data.warrantyUntil) <= seedDate(-60) && String(e.data.warrantyUntil) >= seedDate(0)).length; return { metrics: [{ label: '物品', value: `${entries.length} 件`, note: '有记录' }, { label: '保修临近', value: `${expiring} 件`, note: '60 天内' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '物品条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '记录物品是为了少买重复的东西。' } }
      }]
    },
    {
      id: 'home-maintenance', name: '维护计划', description: '维护任务、区域、到期日、状态；从家务延伸到长期维护。',
      modules: [{
        id: 'maintenance', name: '维护计划', entryLabel: '维护任务',
        fields: [
          { key: 'date', label: '登记日期', type: 'date', required: true },
          { key: 'task', label: '维护任务', type: 'text', required: true },
          { key: 'area', label: '区域', type: 'select', options: ['厨房', '客厅', '卧室', '浴室', '阳台', '全屋'] },
          { key: 'dueDate', label: '下次到期', type: 'date' },
          { key: 'done', label: '状态', type: 'select', options: ['完成', '待办'] },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'task', 'area', 'dueDate'],
        seed: [0, 7, 30].map((offset, i) => ({ date: seedDate(offset), data: { task: ['更换净水器滤芯', '清洗空调滤网', '检查烟雾报警器'][i]!, area: ['厨房', '客厅', '全屋'][i]!, dueDate: [seedDate(-90), seedDate(-30), seedDate(-180)][i]!, done: ['待办', '完成', '待办'][i]!, note: ['', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { const pending = entries.filter(e => e.data.done === '待办').length; return { metrics: [{ label: '维护任务', value: `${entries.length} 项`, note: '全部' }, { label: '待办', value: `${pending} 项`, note: '不催你' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '完成数', values: chartOf(entries, e => e.data.done === '完成' ? 1 : 0) }, streak: streak(entries), hint: '维护是周期，不是一次性清空。' } }
      }]
    }
  ]
}
