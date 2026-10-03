/**
 * 七纪分期（取自 doc/retro-futurism/00_总论 §2.1「七纪分期」表）。
 *
 * 这张表是本站的**核心导航创新**（见 docs/03_信息架构与内容模型.md §六）：
 * Wiki 按纪读史、画廊按纪筛选，共用同一个心智模型——
 * 「纪元」既是历史分期，也是内容分类。
 *
 * 注意作者原话：分期的是**想象的技术**，不是真实历史。
 */
export interface Era {
  /** 纪名，如「神话纪」 */
  name: string
  /** 大致时段 */
  period: string
  /** 未来（彼岸）的形态 */
  form: string
  /** 代表材料 */
  materials: string
  /** 对应主卷篇目号（可多点） */
  orders: number[]
}

export const ERAS: Era[] = [
  {
    name: '神话纪',
    period: '远古—16 世纪',
    form: '彼岸/来世/黄金时代，尚无「未来」概念',
    materials: '飞天神话、永生传说、自动人偶、千禧年主义',
    orders: [2],
  },
  {
    name: '乌托邦纪',
    period: '16—18 世纪',
    form: '制度性「异地」；乌托邦从空间移入时间',
    materials: '莫尔、康帕内拉、培根',
    orders: [3],
  },
  {
    name: '蒸汽与电力纪',
    period: '19 世纪',
    form: '进步论确立，「未来」成为可见的技术延伸',
    materials: '凡尔纳、威尔斯、世纪之交明信片',
    orders: [4, 5],
  },
  {
    name: '机器纪',
    period: '1900—1945',
    form: '速度、垂直城市、战争工业化的崇高',
    materials: '未来主义、装饰艺术、《大都会》、1939 世博会',
    orders: [6, 7],
  },
  {
    name: '原子与太空纪',
    period: '1945—1972',
    form: '绝对能量与宇宙尺度；未来＝更好的现在',
    materials: '原子广告、Googie 建筑、阿波罗时代',
    orders: [8, 9, 10],
  },
  {
    name: '信息纪',
    period: '1970 年代—2000',
    form: '计算机与网络接管「近未来」叙事',
    materials: '磁带终端、赛博朋克、个人电脑革命',
    orders: [14, 15],
  },
  {
    name: '碎片纪',
    period: '2000—今',
    form: '未来产品化；复古本身成为工业',
    materials: '蒸汽波、Y2K、Frutiger Aero、各种回收',
    orders: [17, 18, 19],
  },
]

/** 纪名 → Era（画廊按纪筛选时用） */
export const ERA_BY_NAME = new Map(ERAS.map(e => [e.name, e]))
