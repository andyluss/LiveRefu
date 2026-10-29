// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, seedDate, streak, weekEntries } from '../../packages/core/helpers.ts'

export const config: AppConfig = {
  id: 'journal', name: '好好写', english: 'JOURNAL', port: 4209,
  tagline: '写下来，才知道自己在想什么。',
  description: '每天一段日记，记录心情和能量；提示卡、回顾与感恩作为可选扩展。',
  accent: '#5B4A7A', accentOn: '#FFFDF7', entryLabel: '今日日记',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'entry', label: '今天', type: 'textarea', required: true, placeholder: '发生了什么？' },
    { key: 'mood', label: '心情', type: 'rating' },
    { key: 'energy', label: '能量', type: 'rating' },
    { key: 'tags', label: '标签', type: 'text', placeholder: '工作, 家人, 散步' }
  ],
  columns: ['date', 'mood', 'energy', 'tags'],
  seed: [0, 1, 2, 4, 6].map((offset, i) => ({ date: seedDate(offset), data: { entry: ['今天把积压的事清了一部分。', '有点累，但晚饭后走了走。', '读完一章，记了两句。', '和很久没联系的朋友聊了会儿。', '什么都没做，也算休息。'][i]!, mood: [4, 3, 4, 5, 3][i]!, energy: [3, 2, 4, 4, 2][i]!, tags: ['工作', '散步', '阅读', '朋友', '休息'][i]! } })),
  summary(entries: LifeEntry[]) {
    const week = weekEntries(entries)
    return {
      metrics: [
        { label: '本周日记', value: `${week.length} 篇`, note: '不要求每天' },
        { label: '平均心情', value: week.length ? `${avg(week.map(e => Number(e.data.mood) || 0)).toFixed(1)} / 5` : '—', note: '主观' },
        { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }
      ],
      chart: { label: '心情', values: chartOf(entries, e => Number(e.data.mood) || 0) },
      streak: streak(entries),
      hint: '日记不是作业；空一天不会毁掉记录。'
    }
  },
  packs: [
    {
      id: 'journal-prompts', name: '提示卡', description: '不知道写什么时，用一个问题开始。',
      modules: [{
        id: 'prompts', name: '提示卡', entryLabel: '提示',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'prompt', label: '问题', type: 'text', required: true },
          { key: 'response', label: '回答', type: 'textarea', required: true },
          { key: 'used', label: '是否用过', type: 'select', options: ['是', '否'] },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'prompt', 'used'],
        seed: [0, 2, 5].map((offset, i) => ({ date: seedDate(offset), data: { prompt: ['今天什么让我停了一下？', '最近在回避什么？', '这周有什么小胜利？'][i]!, response: ['窗外的光。', '一次不舒服的对话。', '按时起床。'][i]!, used: ['是', '是', '否'][i]!, note: ['', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { return { metrics: [{ label: '提示卡', value: `${entries.length} 张`, note: '可用' }, { label: '用过', value: `${entries.filter(e => e.data.used === '是').length} 张`, note: '有回答' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '使用次数', values: chartOf(entries, e => e.data.used === '是' ? 1 : 0) }, streak: streak(entries), hint: '提示卡是入口，不是模板。' } }
      }]
    },
    {
      id: 'journal-review', name: '回顾', description: '按周/月回看：发生了什么、学到什么、下一步。',
      modules: [{
        id: 'review', name: '回顾', entryLabel: '回顾',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'period', label: '周期', type: 'select', options: ['本周', '本月', '本季'] },
          { key: 'wins', label: '做成了什么', type: 'textarea' },
          { key: 'lessons', label: '学到什么', type: 'textarea' },
          { key: 'next', label: '下一步', type: 'textarea' }
        ],
        columns: ['date', 'period', 'wins'],
        seed: [7, 30].map((offset, i) => ({ date: seedDate(offset), data: { period: ['本周', '本月'][i]!, wins: ['完成了 Life 第一批应用。', '保持了每周记录。'][i]!, lessons: ['先写文档再写代码有效。', '不要同时开太多 app。'][i]!, next: ['继续下一款。', '保持节奏。'][i]! } })),
        summary(entries: LifeEntry[]) { return { metrics: [{ label: '回顾', value: `${entries.length} 次`, note: '累计' }, { label: '本周', value: `${weekEntries(entries).length} 次`, note: '本周' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '回顾次数', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '回顾不是复盘 KPI；看见模式即可。' } }
      }]
    },
    {
      id: 'journal-gratitude', name: '感恩', description: '每天三件小事，训练注意力而不是强行积极。',
      modules: [{
        id: 'gratitude', name: '感恩', entryLabel: '感恩记录',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'first', label: '第一件', type: 'text' },
          { key: 'second', label: '第二件', type: 'text' },
          { key: 'third', label: '第三件', type: 'text' },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'first', 'second', 'third'],
        seed: [0, 2, 4].map((offset, i) => ({ date: seedDate(offset), data: { first: ['早上的咖啡', '朋友的电话', '散步'][i]!, second: ['窗边的光', '准时下班', '读完一章'][i]!, third: ['晚饭', '安静的晚上', '睡够'][i]!, note: ['', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { return { metrics: [{ label: '感恩记录', value: `${entries.length} 天`, note: '累计' }, { label: '本周', value: `${weekEntries(entries).length} 天`, note: '不要求每天' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '记录天数', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '不是强行积极；只是把注意力放回具体的小事。' } }
      }]
    }
  ]
}
