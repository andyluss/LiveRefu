// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, seedDate, streak, weekEntries } from '../../packages/core/helpers.ts'
export const config: AppConfig = {
  id: 'care', name: '好好养', english: 'CARELOG', port: 4214,
  tagline: '照顾另一个生命，也记录自己的节奏。',
  description: '记录植物/宠物的日常照护；照护计划、健康记录和用品作为可选扩展。',
  accent: '#4F6B3A', accentOn: '#FFFDF7', entryLabel: '照护',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'subject', label: '对象', type: 'text', required: true, placeholder: '例如：绿萝、猫' },
    { key: 'kind', label: '类型', type: 'select', options: ['植物', '宠物', '其它'], required: true },
    { key: 'action', label: '做了什么', type: 'text', required: true },
    { key: 'minutes', label: '分钟', type: 'number', min: 0, max: 300, step: 5 },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  columns: ['date', 'subject', 'kind', 'action'],
  seed: [0, 1, 2, 4, 6].map((offset, i) => ({ date: seedDate(offset), data: { subject: ['绿萝', '猫', '薄荷', '猫', '多肉'][i]!, kind: ['植物', '宠物', '植物', '宠物', '植物'][i]!, action: ['浇水', '喂食', '修剪', '梳毛', '换盆'][i]!, minutes: [5, 10, 8, 15, 20][i]!, note: ['', '', '', '', ''][i]! } })),
  summary(entries: LifeEntry[]) {
    const week = weekEntries(entries)
    return { metrics: [{ label: '本周照护', value: `${week.length} 次`, note: '全部对象' }, { label: '平均分钟', value: week.length ? `${Math.round(avg(week.map(e => Number(e.data.minutes) || 0)))}` : '—', note: '每次' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '照护次数', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '照护不是打卡；对象需要时再做。' }
  },
  packs: [
    { id: 'care-plans', name: '照护计划', description: '周期任务、频率和下次到期；避免忘记。', modules: [{
      id: 'plans', name: '照护计划', entryLabel: '计划',
      fields: [
        { key: 'date', label: '登记日期', type: 'date', required: true },
        { key: 'subject', label: '对象', type: 'text', required: true },
        { key: 'task', label: '任务', type: 'text', required: true },
        { key: 'frequency', label: '频率', type: 'select', options: ['每天', '每周', '每两周', '每月', '按需'] },
        { key: 'nextDate', label: '下次', type: 'date' },
        { key: 'status', label: '状态', type: 'select', options: ['待办', '完成'] }
      ],
      columns: ['date', 'subject', 'task', 'nextDate'],
      seed: [0, 2].map((offset, i) => ({ date: seedDate(offset), data: { subject: ['绿萝', '猫'][i]!, task: ['浇水', '驱虫'][i]!, frequency: ['每周', '每月'][i]!, nextDate: [seedDate(-5), seedDate(-20)][i]!, status: ['待办', '完成'][i]! } })),
      summary(entries: LifeEntry[]) {
        return { metrics: [{ label: '计划', value: `${entries.length} 项`, note: '全部' }, { label: '待办', value: `${entries.filter(e => e.data.status === '待办').length} 项`, note: '不催' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '计划条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '频率是参考，不是命令。' }
      }
    }] },
    { id: 'care-health', name: '健康记录', description: '体重、症状、就医和用药；给长期照护留线索。', modules: [{
      id: 'health', name: '健康记录', entryLabel: '健康',
      fields: [
        { key: 'date', label: '日期', type: 'date', required: true },
        { key: 'subject', label: '对象', type: 'text', required: true },
        { key: 'weight', label: '体重（kg）', type: 'number', min: 0, max: 300, step: 0.1 },
        { key: 'symptom', label: '症状/状态', type: 'text' },
        { key: 'vet', label: '就医/用药', type: 'textarea' },
        { key: 'note', label: '备注', type: 'textarea' }
      ],
      columns: ['date', 'subject', 'weight', 'symptom'],
      seed: [5, 20].map((offset, i) => ({ date: seedDate(offset), data: { subject: ['猫', '绿萝'][i]!, weight: [4.2, 0][i]!, symptom: ['正常', '叶尖发黄'][i]!, vet: ['', '调整浇水'][i]!, note: ['', ''][i]! } })),
      summary(entries: LifeEntry[]) {
        return { metrics: [{ label: '健康记录', value: `${entries.length} 条`, note: '累计' }, { label: '对象', value: `${new Set(entries.map(e => e.data.subject)).size} 个`, note: '有记录' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '健康记录', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '这不是兽医诊断；异常请就医。' }
      }
    }] },
    { id: 'care-supplies', name: '用品', description: '粮食、土、药和耗材；知道还剩什么。', modules: [{
      id: 'supplies', name: '用品', entryLabel: '用品',
      fields: [
        { key: 'date', label: '记录日期', type: 'date', required: true },
        { key: 'name', label: '用品', type: 'text', required: true },
        { key: 'for', label: '用于', type: 'text' },
        { key: 'qty', label: '数量', type: 'number', min: 0, max: 999, step: 1 },
        { key: 'unit', label: '单位', type: 'select', options: ['袋', '瓶', '盒', '包', '个'] },
        { key: 'note', label: '备注', type: 'textarea' }
      ],
      columns: ['date', 'name', 'for', 'qty'],
      seed: [3, 10].map((offset, i) => ({ date: seedDate(offset), data: { name: ['猫粮', '营养土'][i]!, for: ['猫', '绿萝'][i]!, qty: [2, 1][i]!, unit: ['袋', '袋'][i]!, note: ['', ''][i]! } })),
      summary(entries: LifeEntry[]) {
        return { metrics: [{ label: '用品', value: `${entries.length} 项`, note: '全部' }, { label: '总量', value: `${entries.reduce((s, e) => s + Number(e.data.qty || 0), 0)}`, note: '按记录单位' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '用品条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '用品是提醒，不是囤货理由。' }
      }
    }] }
  ]
}
