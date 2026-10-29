// SPDX-License-Identifier: UNLICENSED
import type { AppConfig, LifeEntry } from '../../packages/core/types.ts'
import { avg, chartOf, seedDate, streak, monthEntries } from '../../packages/core/helpers.ts'
export const config: AppConfig = {
  id: 'listen', name: '好好听', english: 'LISTENLOG', port: 4211,
  tagline: '留下听过的声音，而不只是播放次数。',
  description: '记录专辑/单曲/播客、评分和平台；歌单、现场和设备作为可选扩展。',
  accent: '#4F6D7A', accentOn: '#FFFDF7', entryLabel: '听过的',
  fields: [
    { key: 'date', label: '收听日期', type: 'date', required: true },
    { key: 'title', label: '专辑/单曲/节目', type: 'text', required: true },
    { key: 'kind', label: '类型', type: 'select', options: ['专辑', '单曲', '播客', '有声书'], required: true },
    { key: 'artist', label: '音乐人/主播', type: 'text' },
    { key: 'rating', label: '评分', type: 'rating' },
    { key: 'note', label: '听后感', type: 'textarea' }
  ],
  columns: ['date', 'title', 'kind', 'rating'],
  seed: [0, 2, 4, 6, 9].map((offset, i) => ({ date: seedDate(offset), data: { title: ['Dark Side of the Moon', '坂本龍一 / async', '声东击西', 'Kind of Blue', '海边的卡夫卡'][i]!, kind: ['专辑', '专辑', '播客', '专辑', '有声书'][i]!, artist: ['Pink Floyd', '坂本龍一', '声东击西', 'Miles Davis', '村上春树'][i]!, rating: [5, 4, 4, 5, 3][i]!, note: ['', '', '', '', ''][i]! } })),
  summary(entries: LifeEntry[]) {
    const month = monthEntries(entries)
    return { metrics: [{ label: '本月收听', value: `${month.length} 条`, note: '专辑/节目' }, { label: '平均评分', value: month.length ? `${avg(month.map(e => Number(e.data.rating) || 0)).toFixed(1)} / 5` : '—', note: '主观' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '评分', values: chartOf(entries, e => Number(e.data.rating) || 0) }, streak: streak(entries), hint: '听感是当时的，不必和历史一致。' }
  },
  packs: [
    { id: 'listen-playlists', name: '歌单', description: '按场景/心情整理歌单，留住组合而不是单曲。', modules: [{ id: 'playlists', name: '歌单', entryLabel: '歌单', fields: [
      { key: 'date', label: '创建日期', type: 'date', required: true }, { key: 'name', label: '歌单名', type: 'text', required: true }, { key: 'mood', label: '场景/心情', type: 'select', options: ['专注', '放松', '通勤', '夜晚', '运动'] }, { key: 'tracks', label: '曲目', type: 'textarea' }, { key: 'note', label: '备注', type: 'textarea' }
    ], columns: ['date', 'name', 'mood'], seed: [5, 15, 30].map((offset, i) => ({ date: seedDate(offset), data: { name: ['深夜写作', '周末早晨', '通勤'][i]!, mood: ['夜晚', '放松', '通勤'][i]!, tracks: ['Ambient 1', 'Blue in Green', 'Random Access Memories'][i]!, note: ['', '', ''][i]! } })), summary(entries: LifeEntry[]) { return { metrics: [{ label: '歌单', value: `${entries.length} 个`, note: '全部' }, { label: '本周新增', value: `${entries.filter(e => e.date >= seedDate(6)).length} 个`, note: '近 7 天' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '歌单条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '歌单是场景，不是收藏量。' } } }] },
    { id: 'listen-live', name: '现场', description: '演出/场地/同伴；记录现场而不是票根。', modules: [{ id: 'live', name: '现场', entryLabel: '现场', fields: [
      { key: 'date', label: '日期', type: 'date', required: true }, { key: 'artist', label: '演出者', type: 'text', required: true }, { key: 'venue', label: '场地', type: 'text' }, { key: 'companions', label: '同伴', type: 'text' }, { key: 'rating', label: '体验', type: 'rating' }, { key: 'note', label: '备注', type: 'textarea' }
    ], columns: ['date', 'artist', 'venue', 'rating'], seed: [10, 40].map((offset, i) => ({ date: seedDate(offset), data: { artist: ['坂本龍一', '本地乐队'][i]!, venue: ['音乐厅', 'Livehouse'][i]!, companions: ['自己', '朋友'][i]!, rating: [5, 4][i]!, note: ['', ''][i]! } })), summary(entries: LifeEntry[]) { return { metrics: [{ label: '现场', value: `${entries.length} 次`, note: '累计' }, { label: '平均体验', value: entries.length ? `${avg(entries.map(e => Number(e.data.rating) || 0)).toFixed(1)} / 5` : '—', note: '主观' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '现场评分', values: chartOf(entries, e => Number(e.data.rating) || 0) }, streak: streak(entries), hint: '现场感无法被流媒体替代。' } } }] },
    { id: 'listen-devices', name: '设备', description: '耳机/音箱/播放器；找到真正在用的那一套。', modules: [{ id: 'devices', name: '设备', entryLabel: '设备', fields: [
      { key: 'date', label: '加入日期', type: 'date', required: true }, { key: 'name', label: '设备', type: 'text', required: true }, { key: 'kind', label: '类型', type: 'select', options: ['耳机', '音箱', '播放器', '其它'] }, { key: 'status', label: '状态', type: 'select', options: ['常用', '偶尔', '闲置'] }, { key: 'note', label: '备注', type: 'textarea' }
    ], columns: ['date', 'name', 'kind', 'status'], seed: [20, 60, 90].map((offset, i) => ({ date: seedDate(offset), data: { name: ['开放式耳机', '桌面音箱', '旧播放器'][i]!, kind: ['耳机', '音箱', '播放器'][i]!, status: ['常用', '偶尔', '闲置'][i]!, note: ['', '', ''][i]! } })), summary(entries: LifeEntry[]) { return { metrics: [{ label: '设备', value: `${entries.length} 件`, note: '有记录' }, { label: '常用', value: `${entries.filter(e => e.data.status === '常用').length} 件`, note: '高频' }, { label: '连续记录', value: `${streak(entries)} 天`, note: '从今天往前' }], chart: { label: '设备条目', values: chartOf(entries, () => 1) }, streak: streak(entries), hint: '设备是工具，不是收藏展。' } } }] }
  ]
}
