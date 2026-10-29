// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, seedDate, streak, sum, weekEntries } from '../../packages/core/helpers.ts'

export const config: AppConfig = {
  id: 'hydrate', name: '好好喝', english: 'HYDRATE', port: 4208,
  tagline: '喝水不是任务，是照顾身体的最小动作。',
  description: '记录喝了什么、多少、咖啡因和感受；配方、杯具与咖啡因作为可选扩展。',
  accent: '#2F6F8A', accentOn: '#FFFDF7', entryLabel: '一杯',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'waterMl', label: '水量（ml）', type: 'number', min: 0, max: 5000, step: 50, required: true },
    { key: 'drink', label: '喝了什么', type: 'text', placeholder: '例如：温水、乌龙茶' },
    { key: 'caffeineMg', label: '咖啡因（mg）', type: 'number', min: 0, max: 1000, step: 5 },
    { key: 'mood', label: '喝完感受', type: 'rating' },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  columns: ['date', 'waterMl', 'drink', 'caffeineMg'],
  seed: [0, 0, 1, 2, 4].map((offset, i) => ({ date: seedDate(offset), data: { waterMl: [500, 350, 800, 600, 450][i]!, drink: ['温水', '美式', '乌龙茶', '温水', '柠檬水'][i]!, caffeineMg: [0, 95, 40, 0, 0][i]!, mood: [4, 3, 5, 4, 3][i]!, note: ['', '', '', '', ''][i]! } })),
  summary(entries: LifeEntry[]) {
    const week = weekEntries(entries)
    const today = entries.filter(e => e.date === new Date().toISOString().slice(0, 10))
    return {
      metrics: [
        { label: '今日饮水', value: `${sum(today.map(e => Number(e.data.waterMl) || 0))} ml`, note: `${today.length} 杯` },
        { label: '本周日均', value: week.length ? `${Math.round(avg(week.map(e => Number(e.data.waterMl) || 0)))} ml` : '—', note: '按记录' },
        { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }
      ],
      chart: { label: '饮水量（ml）', values: chartOf(entries, e => Number(e.data.waterMl) || 0) },
      streak: streak(entries),
      hint: '提示不是医嘱；渴了就喝。'
    }
  },
  packs: [
    {
      id: 'hydrate-recipes', name: '饮品配方', description: '把常喝的配方记下来，减少临时决策。',
      modules: [{
        id: 'recipes', name: '饮品配方', entryLabel: '配方',
        fields: [
          { key: 'date', label: '记录日期', type: 'date', required: true },
          { key: 'name', label: '名称', type: 'text', required: true },
          { key: 'kind', label: '类型', type: 'select', options: ['水', '茶', '咖啡', '气泡', '其它'] },
          { key: 'ingredients', label: '配方', type: 'textarea', placeholder: '例如：乌龙 5g + 90°C 300ml' },
          { key: 'rating', label: '喜欢程度', type: 'rating' },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'name', 'kind', 'rating'],
        seed: [0, 2, 5].map((offset, i) => ({ date: seedDate(offset), data: { name: ['冷泡乌龙', '柠檬气泡水', '手冲'][i]!, kind: ['茶', '气泡', '咖啡'][i]!, ingredients: ['乌龙 5g + 冷水 500ml 冷藏 6h', '柠檬片 + 气泡水 300ml', '咖啡豆 15g + 水 240ml'][i]!, rating: [5, 4, 4][i]!, note: ['', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { return { metrics: [{ label: '配方', value: `${entries.length} 个`, note: '常喝' }, { label: '平均喜欢', value: entries.length ? `${avg(entries.map(e => Number(e.data.rating) || 0)).toFixed(1)} / 5` : '—', note: '主观' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '配方条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '配方是减少决策，不是增加仪式。' } }
      }]
    },
    {
      id: 'hydrate-cups', name: '杯具', description: '杯子容量、材质和位置；找到自己真正会用的那一只。',
      modules: [{
        id: 'cups', name: '杯具', entryLabel: '杯子',
        fields: [
          { key: 'date', label: '加入日期', type: 'date', required: true },
          { key: 'name', label: '杯子', type: 'text', required: true },
          { key: 'volumeMl', label: '容量（ml）', type: 'number', min: 50, max: 3000, step: 10 },
          { key: 'material', label: '材质', type: 'select', options: ['玻璃', '陶瓷', '不锈钢', '塑料', '其它'] },
          { key: 'place', label: '位置', type: 'select', options: ['家', '办公室', '随身', '其它'] },
          { key: 'status', label: '状态', type: 'select', options: ['常用', '偶尔', '闲置'] }
        ],
        columns: ['date', 'name', 'volumeMl', 'status'],
        seed: [5, 30, 60].map((offset, i) => ({ date: seedDate(offset), data: { name: ['玻璃杯', '保温杯', '马克杯'][i]!, volumeMl: [350, 500, 300][i]!, material: ['玻璃', '不锈钢', '陶瓷'][i]!, place: ['家', '随身', '办公室'][i]!, status: ['常用', '常用', '闲置'][i]! } })),
        summary(entries: LifeEntry[]) { return { metrics: [{ label: '杯具', value: `${entries.length} 只`, note: '有记录' }, { label: '常用', value: `${entries.filter(e => e.data.status === '常用').length} 只`, note: '高频' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '杯具条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '一只顺手的杯子比十只摆件有用。' } }
      }]
    },
    {
      id: 'hydrate-caffeine', name: '咖啡因', description: '咖啡/茶的量与时间；看见下午那杯的影响。',
      modules: [{
        id: 'caffeine', name: '咖啡因', entryLabel: '咖啡因记录',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'drink', label: '饮品', type: 'text', required: true },
          { key: 'mg', label: '咖啡因（mg）', type: 'number', min: 0, max: 1000, step: 5 },
          { key: 'time', label: '时间', type: 'time' },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'drink', 'mg', 'time'],
        seed: [0, 1, 3, 5].map((offset, i) => ({ date: seedDate(offset), data: { drink: ['美式', '乌龙茶', '拿铁', '抹茶'][i]!, mg: [95, 40, 120, 60][i]!, time: ['08:30', '14:00', '10:00', '15:30'][i]!, note: ['', '', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { const week = weekEntries(entries); return { metrics: [{ label: '本周咖啡因', value: `${sum(week.map(e => Number(e.data.mg) || 0))} mg`, note: '按记录' }, { label: '本周次数', value: `${week.length} 次`, note: '含茶' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '咖啡因（mg）', values: chartOf(entries, e => Number(e.data.mg) || 0) }, streak: streak(entries), hint: '只是观察，不替代医学建议。' } }
      }]
    }
  ]
}
