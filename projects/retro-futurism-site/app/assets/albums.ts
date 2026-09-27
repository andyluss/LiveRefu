/**
 * 画廊专辑定义。
 *
 * 与 `tools/sync-gallery.ts` 的 ALBUMS 一一对应（那边写入 `album` key，
 * 这边提供展示顺序与说明）。新增专辑时两处都要改。
 */
export interface AlbumMeta {
  key: string
  title: string
  note: string
}

export const ALBUM_META: AlbumMeta[] = [
  { key: 'cards', title: '卡面 · 铁砧联邦', note: '卡面版式含卡号、费用、槽位色带、关键词与数值块。' },
  { key: 'units', title: '单位设定', note: '敌方六原型（小兵/快速/装甲/空中/精英/BOSS）与三从族个体。' },
  { key: 'maps', title: '地图 · 战场俯视', note: '含路径、三类塔位、地形、入口基地、图例与波次卡组标注。' },
  { key: 'map-motion', title: '地图动态 · 双路并行', note: '四张双入口图的波次并行帧，SVG 源含 SMIL 动画。' },
  { key: 'summary', title: '汇总图', note: '按族群分组的 12 卡汇总等总览图。' },
  { key: 'style-cases-001', title: '美学方案 001 · SVG 案例', note: '复古未来基调方案的六张矢量案例。' },
  { key: 'style-cases-002', title: '美学方案 002 · 千禧透明', note: '千禧透明美学平行方案的七张矢量案例。' },
  { key: 'export-2048', title: '高清导出 · 2048px', note: '可直接用于展示与印刷的 2048px 位图导出。' },
]

export const ALBUM_TITLE = new Map(ALBUM_META.map(a => [a.key, a.title]))

/** 画廊条目（对应 content/gallery/** 的 frontmatter） */
export interface GalleryItem {
  title: string
  album: string
  albumTitle?: string
  media: 'image' | 'video' | 'svg' | 'pdf'
  src: string
  thumb?: string
  era?: string
  tags: string[]
  credit: string
  note?: string
  order: number
}
