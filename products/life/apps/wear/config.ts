// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, seedDate, streak, weekEntries } from '../../packages/core/helpers.ts'

export const config: AppConfig = {
  id: 'wear', name: '好好穿', english: 'WEARWELL', port: 4207,
  tagline: '先看见已经有的，再决定穿什么。',
  description: '记录每天穿了什么、舒不舒服，以及衣橱、洗衣和想买的东西。不是穿搭评分。',
  accent: '#7A4E6D', accentOn: '#FFFDF7', entryLabel: '今日穿搭',
  fields: [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'outfit', label: '穿了什么', type: 'text', required: true, placeholder: '例如：白衬衫 + 牛仔裤' },
    { key: 'weather', label: '天气', type: 'select', options: ['晴', '阴', '雨', '冷', '热'] },
    { key: 'comfort', label: '舒适度', type: 'rating' },
    { key: 'note', label: '备注', type: 'textarea', placeholder: '例如：鞋有点磨脚' }
  ],
  columns: ['date', 'outfit', 'weather', 'comfort'],
  seed: [0, 1, 2, 3, 5].map((offset, i) => ({
    date: seedDate(offset),
    data: { outfit: ['白衬衫 + 牛仔裤', '针织衫 + 长裙', '卫衣 + 工装裤', '风衣 + 黑裤', 'T恤 + 短裤'][i]!, weather: ['晴', '阴', '雨', '冷', '热'][i]!, comfort: [4, 5, 3, 4, 2][i]!, note: ['', '', '鞋有点磨脚', '', '太热'][i]! }
  })),
  summary(entries: LifeEntry[]) {
    const week = weekEntries(entries)
    return {
      metrics: [
        { label: '本周记录', value: `${week.length} 天`, note: '穿搭' },
        { label: '平均舒适', value: week.length ? `${avg(week.map(e => Number(e.data.comfort) || 0)).toFixed(1)} / 5` : '—', note: '主观' },
        { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }
      ],
      chart: { label: '舒适度', values: chartOf(entries, e => Number(e.data.comfort) || 0) },
      streak: streak(entries),
      hint: '穿搭记录是为了减少“没衣服穿”的错觉。'
    }
  },
  packs: [
    {
      id: 'wear-closet', name: '衣橱', description: '衣物、类别、颜色、季节和状态；先知道有什么。',
      modules: [{
        id: 'closet', name: '衣橱', entryLabel: '衣物',
        fields: [
          { key: 'date', label: '加入日期', type: 'date', required: true },
          { key: 'name', label: '衣物', type: 'text', required: true },
          { key: 'category', label: '类别', type: 'select', options: ['上装', '下装', '外套', '鞋', '包', '配饰'] },
          { key: 'color', label: '颜色', type: 'text' },
          { key: 'season', label: '季节', type: 'select', options: ['春', '夏', '秋', '冬', '四季'] },
          { key: 'status', label: '状态', type: 'select', options: ['常穿', '偶尔', '闲置', '待处理'] },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'name', 'category', 'status'],
        seed: [10, 20, 30, 45, 60].map((offset, i) => ({ date: seedDate(offset), data: { name: ['白衬衫', '牛仔裤', '风衣', '跑鞋', '帆布包'][i]!, category: ['上装', '下装', '外套', '鞋', '包'][i]!, color: ['白', '蓝', '卡其', '灰', '米'][i]!, season: ['四季', '四季', '秋', '四季', '四季'][i]!, status: ['常穿', '常穿', '偶尔', '常穿', '闲置'][i]!, note: ['', '', '', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { const idle = entries.filter(e => e.data.status === '闲置' || e.data.status === '待处理').length; return { metrics: [{ label: '衣橱', value: `${entries.length} 件`, note: '有记录' }, { label: '常穿', value: `${entries.filter(e => e.data.status === '常穿').length} 件`, note: '高频' }, { label: '闲置/待处理', value: `${idle} 件`, note: '不催扔' }], chart: { label: '衣橱条目', values: chartOf(entries, () => 1) }, hint: '先记录，再决定要不要处理。' } }
      }]
    },
    {
      id: 'wear-laundry', name: '洗衣', description: '洗衣批次、方式、状态；减少“这件到底洗没洗”的记忆负担。',
      modules: [{
        id: 'laundry', name: '洗衣', entryLabel: '洗衣批次',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'items', label: '洗了什么', type: 'text', required: true, placeholder: '例如：衬衫、毛巾' },
          { key: 'method', label: '方式', type: 'select', options: ['机洗', '手洗', '干洗'] },
          { key: 'status', label: '状态', type: 'select', options: ['待洗', '已洗', '已收'] },
          { key: 'note', label: '备注', type: 'textarea' }
        ],
        columns: ['date', 'items', 'method', 'status'],
        seed: [1, 4, 8].map((offset, i) => ({ date: seedDate(offset), data: { items: ['衬衫、T恤', '毛巾、床单', '外套'][i]!, method: ['机洗', '机洗', '干洗'][i]!, status: ['已收', '已洗', '待洗'][i]!, note: ['', '', ''][i]! } })),
        summary(entries: LifeEntry[]) { const pending = entries.filter(e => e.data.status === '待洗').length; return { metrics: [{ label: '洗衣批次', value: `${entries.length} 次`, note: '全部' }, { label: '待洗', value: `${pending} 批`, note: '不催' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '已洗批次', values: chartOf(entries, e => e.data.status !== '待洗' ? 1 : 0) }, streak: streak(entries), hint: '洗衣记录只解决记忆，不解决家务分配。' } }
      }]
    },
    {
      id: 'wear-wishlist', name: '愿望清单', description: '想买什么、为什么、优先级；避免重复购买。',
      modules: [{
        id: 'wishlist', name: '愿望清单', entryLabel: '想买',
        fields: [
          { key: 'date', label: '日期', type: 'date', required: true },
          { key: 'item', label: '物品', type: 'text', required: true },
          { key: 'reason', label: '为什么', type: 'textarea' },
          { key: 'priority', label: '优先级', type: 'select', options: ['低', '中', '高'] },
          { key: 'price', label: '预算（元）', type: 'number', min: 0, max: 100000, step: 1 },
          { key: 'status', label: '状态', type: 'select', options: ['观望', '决定买', '已买', '放弃'] }
        ],
        columns: ['date', 'item', 'priority', 'status'],
        seed: [2, 12, 30].map((offset, i) => ({ date: seedDate(offset), data: { item: ['黑色乐福鞋', '薄款风衣', '羊毛围巾'][i]!, reason: ['通勤', '换季', '冬天'][i]!, priority: ['中', '高', '低'][i]!, price: [600, 900, 300][i]!, status: ['观望', '决定买', '放弃'][i]! } })),
        summary(entries: LifeEntry[]) { const waiting = entries.filter(e => e.data.status === '观望' || e.data.status === '决定买').length; return { metrics: [{ label: '愿望', value: `${entries.length} 项`, note: '全部' }, { label: '还在等', value: `${waiting} 项`, note: '不催买' }, { label: '预算合计', value: `¥${entries.filter(e => e.data.status !== '放弃').reduce((s, e) => s + Number(e.data.price || 0), 0)}`, note: '参考' }], chart: { label: '愿望条目', values: chartOf(entries, () => 1) }, hint: '愿望清单是延迟决策，不是购物车。' } }
      }]
    }
  ]
}
