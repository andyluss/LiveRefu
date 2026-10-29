// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { chartOf, seedDate, streak, sum, weekEntries } from '../../packages/core/helpers.ts'
export const config: AppConfig = {
  id: 'organize', name: '好好整', english: 'TIDYLOG', port: 4215,
  tagline: '整理不是清空，是让东西有去处。',
  description: '记录整理行动；空间、物品去向和捐赠处理作为可选扩展。',
  accent: '#6B5B3A', accentOn: '#FFFDF7', entryLabel: '整理',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'area', label: '区域', type: 'select', options: ['厨房', '客厅', '卧室', '浴室', '阳台', '全屋'], required: true },
    { key: 'action', label: '做了什么', type: 'text', required: true },
    { key: 'minutes', label: '分钟', type: 'number', min: 0, max: 600, step: 5 },
    { key: 'feeling', label: '整理后感受', type: 'rating' },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  columns: ['date', 'area', 'action', 'minutes'],
  seed: [0, 2, 4, 6, 8].map((offset, i) => ({ date: seedDate(offset), data: { area: ['厨房', '客厅', '卧室', '浴室', '阳台'][i]!, action: ['清空台面', '整理书架', '换季衣物', '清理过期品', '收好工具'][i]!, minutes: [25, 40, 50, 15, 20][i]!, feeling: [4, 5, 3, 4, 4][i]!, note: ['', '', '', '', ''][i]! } })),
  summary(entries: LifeEntry[]) {
    const week = weekEntries(entries)
    return { metrics: [{ label: '本周整理', value: `${week.length} 次`, note: '全部' }, { label: '本周分钟', value: `${sum(week.map(e => Number(e.data.minutes) || 0))}`, note: '投入' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '整理分钟', values: chartOf(entries, e => Number(e.data.minutes) || 0) }, streak: streak(entries), hint: '整理不是一次性清空；能维持才算数。' }
  },
  packs: [
    { id: 'organize-spaces', name: '空间', description: '房间/区域状态和上次整理；看见维持成本。', modules: [{
      id: 'spaces', name: '空间', entryLabel: '空间',
      fields: [
        { key: 'date', label: '记录日期', type: 'date', required: true },
        { key: 'space', label: '空间', type: 'text', required: true },
        { key: 'kind', label: '类型', type: 'select', options: ['房间', '柜子', '桌面', '储物', '其它'] },
        { key: 'status', label: '状态', type: 'select', options: ['清爽', '一般', '堆积'] },
        { key: 'lastTidied', label: '上次整理', type: 'date' },
        { key: 'note', label: '备注', type: 'textarea' }
      ],
      columns: ['date', 'space', 'kind', 'status'],
      seed: [0, 5, 12].map((offset, i) => ({ date: seedDate(offset), data: { space: ['厨房台面', '衣柜', '书桌'][i]!, kind: ['桌面', '柜子', '桌面'][i]!, status: ['清爽', '一般', '堆积'][i]!, lastTidied: [seedDate(1), seedDate(8), seedDate(15)][i]!, note: ['', '', ''][i]! } })),
      summary(entries: LifeEntry[]) { return { metrics: [{ label: '空间', value: `${entries.length} 个`, note: '有记录' }, { label: '堆积', value: `${entries.filter(e => e.data.status === '堆积').length} 个`, note: '不催' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '空间条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '状态是观察，不是评分。' } }
    }] },
    { id: 'organize-items', name: '物品去向', description: '每件东西是留下、送走、卖掉还是丢掉。', modules: [{
      id: 'items', name: '物品去向', entryLabel: '物品',
      fields: [
        { key: 'date', label: '日期', type: 'date', required: true },
        { key: 'item', label: '物品', type: 'text', required: true },
        { key: 'room', label: '房间', type: 'text' },
        { key: 'destination', label: '去向', type: 'select', options: ['留下', '送走', '卖掉', '丢掉'], required: true },
        { key: 'status', label: '状态', type: 'select', options: ['待处理', '已处理'] },
        { key: 'note', label: '原因', type: 'textarea' }
      ],
      columns: ['date', 'item', 'destination', 'status'],
      seed: [1, 3, 6].map((offset, i) => ({ date: seedDate(offset), data: { item: ['旧杯子', '不合身的衣服', '坏掉的充电线'][i]!, room: ['厨房', '卧室', '客厅'][i]!, destination: ['送走', '送走', '丢掉'][i]!, status: ['已处理', '待处理', '已处理'][i]!, note: ['', '一直没穿', ''][i]! } })),
      summary(entries: LifeEntry[]) { const pending = entries.filter(e => e.data.status === '待处理').length; return { metrics: [{ label: '物品', value: `${entries.length} 件`, note: '有记录' }, { label: '待处理', value: `${pending} 件`, note: '不催' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '处理条目', values: chartOf(entries, e => e.data.status === '已处理' ? 1 : 0) }, streak: streak(entries), hint: '去向明确，比“先放着”更轻。' } }
    }] },
    { id: 'organize-donations', name: '捐赠/处理', description: '送走的东西去了哪里；留下处理记录。', modules: [{
      id: 'donations', name: '捐赠/处理', entryLabel: '处理',
      fields: [
        { key: 'date', label: '日期', type: 'date', required: true },
        { key: 'item', label: '物品', type: 'text', required: true },
        { key: 'channel', label: '渠道', type: 'select', options: ['捐赠', '二手', '回收', '丢弃'] },
        { key: 'status', label: '状态', type: 'select', options: ['待处理', '已完成'] },
        { key: 'note', label: '备注', type: 'textarea' }
      ],
      columns: ['date', 'item', 'channel', 'status'],
      seed: [2, 7].map((offset, i) => ({ date: seedDate(offset), data: { item: ['旧书', '纸箱'][i]!, channel: ['捐赠', '回收'][i]!, status: ['已完成', '待处理'][i]!, note: ['', ''][i]! } })),
      summary(entries: LifeEntry[]) { return { metrics: [{ label: '处理', value: `${entries.length} 项`, note: '全部' }, { label: '已完成', value: `${entries.filter(e => e.data.status === '已完成').length} 项`, note: '送走' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '完成数', values: chartOf(entries, e => e.data.status === '已完成' ? 1 : 0) }, streak: streak(entries), hint: '处理不是丢弃一切；是让去向清楚。' } }
    }] }
  ]
}
