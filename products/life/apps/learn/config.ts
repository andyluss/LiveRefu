// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, seedDate, streak, sum, weekEntries } from '../../packages/core/helpers.ts'
export const config: AppConfig = {
  id: 'learn', name: '好好学', english: 'LEARNLOG', port: 4212,
  tagline: '学习不是收藏，是把时间放在具体的事上。',
  description: '记录学习主题、时长和进展；课程、技能地图和笔记作为可选扩展。',
  accent: '#3B6B5A', accentOn: '#FFFDF7', entryLabel: '学习',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'topic', label: '主题', type: 'text', required: true, placeholder: '例如：TypeScript 类型体操' },
    { key: 'activity', label: '方式', type: 'select', options: ['阅读', '课程', '练习', '项目', '讨论'] },
    { key: 'minutes', label: '分钟', type: 'number', min: 0, max: 720, step: 5 },
    { key: 'progress', label: '进展感受', type: 'rating' },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  columns: ['date', 'topic', 'activity', 'minutes'],
  seed: [0, 1, 3, 5, 7].map((offset, i) => ({ date: seedDate(offset), data: { topic: ['TypeScript 类型', 'CSS 布局', '数据库索引', '英语听力', '产品文档'][i]!, activity: ['阅读', '练习', '课程', '练习', '项目'][i]!, minutes: [40, 30, 45, 20, 60][i]!, progress: [4, 3, 4, 3, 5][i]!, note: ['', '', '', '', ''][i]! } })),
  summary(entries: LifeEntry[]) {
    const week = weekEntries(entries)
    return {
      metrics: [
        { label: '本周分钟', value: `${sum(week.map(e => Number(e.data.minutes) || 0))}`, note: `${week.length} 次` },
        { label: '平均进展', value: week.length ? `${avg(week.map(e => Number(e.data.progress) || 0)).toFixed(1)} / 5` : '—', note: '主观' },
        { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }
      ],
      chart: { label: '学习分钟', values: chartOf(entries, e => Number(e.data.minutes) || 0) },
      streak: streak(entries),
      hint: '时长不是成果；记录是为了看见投入。'
    }
  },
  packs: [
    { id: 'learn-courses', name: '课程', description: '课程/平台/进度；避免买了课就当作学过。', modules: [{
      id: 'courses', name: '课程', entryLabel: '课程',
      fields: [
        { key: 'date', label: '加入日期', type: 'date', required: true },
        { key: 'name', label: '课程名', type: 'text', required: true },
        { key: 'platform', label: '平台', type: 'text' },
        { key: 'status', label: '状态', type: 'select', options: ['想学', '在学', '学完', '暂停'] },
        { key: 'progress', label: '进度（%）', type: 'number', min: 0, max: 100, step: 5 },
        { key: 'note', label: '备注', type: 'textarea' }
      ],
      columns: ['date', 'name', 'status', 'progress'],
      seed: [10, 30].map((offset, i) => ({ date: seedDate(offset), data: { name: ['TypeScript 深入', '数据库系统'][i]!, platform: ['自建', '公开课'][i]!, status: ['在学', '暂停'][i]!, progress: [45, 20][i]!, note: ['', ''][i]! } })),
      summary(entries: LifeEntry[]) {
        return { metrics: [{ label: '课程', value: `${entries.length} 门`, note: '全部' }, { label: '在学', value: `${entries.filter(e => e.data.status === '在学').length} 门`, note: '当前' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '课程条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '暂停不是失败。' }
      }
    }] },
    { id: 'learn-skills', name: '技能地图', description: '技能、当前水平、目标；看见长期方向。', modules: [{
      id: 'skills', name: '技能地图', entryLabel: '技能',
      fields: [
        { key: 'date', label: '更新日期', type: 'date', required: true },
        { key: 'skill', label: '技能', type: 'text', required: true },
        { key: 'level', label: '当前水平', type: 'select', options: ['入门', '会用', '熟练', '能教'] },
        { key: 'target', label: '下一步目标', type: 'text' },
        { key: 'note', label: '备注', type: 'textarea' }
      ],
      columns: ['date', 'skill', 'level', 'target'],
      seed: [20, 60].map((offset, i) => ({ date: seedDate(offset), data: { skill: ['TypeScript', '产品写作'][i]!, level: ['会用', '入门'][i]!, target: ['独立设计类型', '写清一个功能'][i]!, note: ['', ''][i]! } })),
      summary(entries: LifeEntry[]) {
        return { metrics: [{ label: '技能', value: `${entries.length} 项`, note: '有记录' }, { label: '熟练+', value: `${entries.filter(e => e.data.level === '熟练' || e.data.level === '能教').length} 项`, note: '当前' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '技能条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '地图不是排名。' }
      }
    }] },
    { id: 'learn-notes', name: '学习笔记', description: '主题、来源、关键句；把输入变成可回看的东西。', modules: [{
      id: 'notes', name: '学习笔记', entryLabel: '笔记',
      fields: [
        { key: 'date', label: '日期', type: 'date', required: true },
        { key: 'topic', label: '主题', type: 'text', required: true },
        { key: 'source', label: '来源', type: 'text' },
        { key: 'note', label: '笔记', type: 'textarea', required: true },
        { key: 'review', label: '待复习', type: 'select', options: ['是', '否'] }
      ],
      columns: ['date', 'topic', 'source', 'review'],
      seed: [1, 4, 8].map((offset, i) => ({ date: seedDate(offset), data: { topic: ['类型收窄', '网格布局', '索引选择性'][i]!, source: ['文档', '课程', '书'][i]!, note: ['用 in 收窄联合类型。', 'fr 单位用于分配剩余空间。', '高选择性索引更适合等值查询。'][i]!, review: ['是', '否', '是'][i]! } })),
      summary(entries: LifeEntry[]) {
        return { metrics: [{ label: '笔记', value: `${entries.length} 条`, note: '全部' }, { label: '待复习', value: `${entries.filter(e => e.data.review === '是').length} 条`, note: '不催' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '笔记条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '笔记的价值在回看，不在数量。' }
      }
    }] }
  ]
}
