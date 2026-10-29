// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { chartOf, seedDate, streak, weekEntries } from '../../packages/core/helpers.ts'
export const config: AppConfig = {
  id: 'connect', name: '好好聊', english: 'CONNECT', port: 4216,
  tagline: '关系需要被想起，也需要被照顾。',
  description: '记录联系、对话和重要日子；人物、礼物和日期作为可选扩展。',
  accent: '#8A4B5A', accentOn: '#FFFDF7', entryLabel: '联系',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'person', label: '和谁', type: 'text', required: true },
    { key: 'channel', label: '方式', type: 'select', options: ['见面', '电话', '消息', '其它'] },
    { key: 'minutes', label: '时长（分钟）', type: 'number', min: 0, max: 600, step: 5 },
    { key: 'mood', label: '聊完感受', type: 'rating' },
    { key: 'note', label: '聊了什么', type: 'textarea' }
  ],
  columns: ['date', 'person', 'channel', 'minutes'],
  seed: [0, 2, 4, 7, 10].map((offset, i) => ({ date: seedDate(offset), data: { person: ['阿岚', '妈妈', '老同学', '阿岚', '同事'][i]!, channel: ['消息', '电话', '见面', '见面', '消息'][i]!, minutes: [10, 30, 90, 60, 15][i]!, mood: [4, 5, 5, 4, 3][i]!, note: ['', '', '', '', ''][i]! } })),
  summary(entries: LifeEntry[]) {
    const week = weekEntries(entries)
    return { metrics: [{ label: '本周联系', value: `${week.length} 次`, note: '不要求每天' }, { label: '联系人', value: `${new Set(entries.map(e => e.data.person)).size} 位`, note: '有记录' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '联系次数', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '关系不是 KPI；记录是为了不忘记。' }
  },
  packs: [
    { id: 'connect-people', name: '人物', description: '重要的人、关系、联系方式和生日；把“想起”变成可查。', modules: [{
      id: 'people', name: '人物', entryLabel: '人物',
      fields: [
        { key: 'date', label: '加入日期', type: 'date', required: true },
        { key: 'name', label: '名字', type: 'text', required: true },
        { key: 'relation', label: '关系', type: 'select', options: ['家人', '朋友', '同事', '同学', '其它'] },
        { key: 'contact', label: '联系方式', type: 'text' },
        { key: 'birthday', label: '生日', type: 'date' },
        { key: 'note', label: '备注', type: 'textarea' }
      ],
      columns: ['date', 'name', 'relation', 'birthday'],
      seed: [20, 50, 80].map((offset, i) => ({ date: seedDate(offset), data: { name: ['阿岚', '妈妈', '老同学'][i]!, relation: ['朋友', '家人', '同学'][i]!, contact: ['', '电话', ''][i]!, birthday: [seedDate(-100), seedDate(-200), seedDate(-300)][i]!, note: ['', '', ''][i]! } })),
      summary(entries: LifeEntry[]) { return { metrics: [{ label: '人物', value: `${entries.length} 位`, note: '有记录' }, { label: '家人', value: `${entries.filter(e => e.data.relation === '家人').length} 位`, note: '关系' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '人物条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '人物卡是提醒，不是 CRM。' } }
    }] },
    { id: 'connect-gifts', name: '礼物', description: '想送什么、给谁、预算和状态；减少临时焦虑。', modules: [{
      id: 'gifts', name: '礼物', entryLabel: '礼物',
      fields: [
        { key: 'date', label: '记录日期', type: 'date', required: true },
        { key: 'person', label: '给谁', type: 'text', required: true },
        { key: 'occasion', label: '场合', type: 'select', options: ['生日', '节日', '纪念日', '随手', '其它'] },
        { key: 'gift', label: '礼物', type: 'text' },
        { key: 'budget', label: '预算（元）', type: 'number', min: 0, max: 100000, step: 1 },
        { key: 'status', label: '状态', type: 'select', options: ['想法', '已买', '已送'] }
      ],
      columns: ['date', 'person', 'occasion', 'status'],
      seed: [5, 20].map((offset, i) => ({ date: seedDate(offset), data: { person: ['阿岚', '妈妈'][i]!, occasion: ['生日', '节日'][i]!, gift: ['一本书', '围巾'][i]!, budget: [120, 300][i]!, status: ['想法', '已送'][i]! } })),
      summary(entries: LifeEntry[]) { const idea = entries.filter(e => e.data.status === '想法').length; return { metrics: [{ label: '礼物', value: `${entries.length} 项`, note: '全部' }, { label: '想法', value: `${idea} 项`, note: '不催' }, { label: '预算', value: `¥${entries.reduce((s, e) => s + Number(e.data.budget || 0), 0)}`, note: '参考' }], chart: { label: '礼物条目', values: chartOf(entries, () => 1) }, hint: '礼物不是补偿；是具体的心意。' } }
    }] },
    { id: 'connect-dates', name: '重要日期', description: '生日、纪念日、约定；提前知道，而不是当天想起。', modules: [{
      id: 'dates', name: '重要日期', entryLabel: '日期',
      fields: [
        { key: 'date', label: '记录日期', type: 'date', required: true },
        { key: 'person', label: '相关的人', type: 'text', required: true },
        { key: 'occasion', label: '场合', type: 'text', required: true },
        { key: 'eventDate', label: '日期', type: 'date' },
        { key: 'reminder', label: '提前提醒（天）', type: 'number', min: 0, max: 365, step: 1 },
        { key: 'note', label: '备注', type: 'textarea' }
      ],
      columns: ['date', 'person', 'occasion', 'eventDate'],
      seed: [10, 30].map((offset, i) => ({ date: seedDate(offset), data: { person: ['妈妈', '阿岚'][i]!, occasion: ['生日', '纪念日'][i]!, eventDate: [seedDate(-100), seedDate(-200)][i]!, reminder: [7, 3][i]!, note: ['', ''][i]! } })),
      summary(entries: LifeEntry[]) { return { metrics: [{ label: '日期', value: `${entries.length} 个`, note: '全部' }, { label: '提醒', value: `${entries.filter(e => Number(e.data.reminder) > 0).length} 个`, note: '有设置' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '日期条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '提前想起，比当天补救更轻。' } }
    }] }
  ]
}
