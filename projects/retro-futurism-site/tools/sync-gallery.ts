#!/usr/bin/env bun
/**
 * 画廊条目生成器：扫描 `doc/` 下的视觉素材 → `content/gallery/*.md`。
 *
 * 与 `sync-content.ts` 同源原则（见 docs/03 §二）：
 *   **doc/ 是唯一内容权威，本脚本只读不写源文件**；素材通过 `/media/**`
 *   路由只读暴露（见 server/routes/media/[...].get.ts），不复制进 public/。
 *
 * 为什么用「一条 md 一个作品」而不是一个 JSON：这样画廊条目同样是可版本化、
 * 可人工补充 `credit`/`note`/`era` 的文本文件，且复用 Nuxt Content 的查询与校验。
 *
 * 用法：
 *   bun run tools/sync-gallery.ts            # 生成
 *   bun run tools/sync-gallery.ts --check    # 只校验是否最新
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(HERE, '..')
const WORKSPACE_ROOT = resolve(PROJECT_ROOT, '../..')
const DOC = resolve(WORKSPACE_ROOT, 'doc')
const ART = join(DOC, 'refu-game-001/美术')
const OUT = join(PROJECT_ROOT, 'content/gallery')

const check = process.argv.includes('--check')
const warnings: string[] = []

interface Entry {
  album: string
  albumTitle: string
  media: 'image' | 'svg' | 'video' | 'pdf'
  /** doc/ 下的相对路径，经 /media/ 暴露 */
  src: string
  title: string
  tags: string[]
  credit: string
  note?: string
  order: number
}

/** 专辑定义：目录 → 专辑元信息 */
interface AlbumSpec {
  key: string
  title: string
  dir: string
  ext: 'svg' | 'png'
  tags: string[]
  credit: string
  note: string
  /** 从文件名取显示名：去掉扩展名与前缀编号 */
  stripPrefix?: RegExp
}

const ALBUMS: AlbumSpec[] = [
  {
    key: 'cards',
    title: '卡面 · 铁砧联邦',
    dir: '全量出图/卡面/PNG预览',
    ext: 'png',
    tags: ['卡面', '全量出图'],
    credit: 'doc/refu-game-001/美术/全量出图/卡面（PNG 预览；矢量源为同目录同名 SVG）',
    note: '卡面版式含卡号、费用、槽位色带、关键词与数值块。',
  },
  {
    key: 'units',
    title: '单位设定',
    dir: '全量出图/单位/PNG预览',
    ext: 'png',
    tags: ['单位设定', '全量出图'],
    credit: 'doc/refu-game-001/美术/全量出图/单位（PNG 预览；矢量源为同目录同名 SVG）',
    note: '敌方六原型（小兵/快速/装甲/空中/精英/BOSS）与三从族个体的设定图。',
  },
  {
    key: 'maps',
    title: '地图 · 战场俯视',
    dir: '全量出图/地图/PNG预览',
    ext: 'png',
    tags: ['地图', '全量出图'],
    credit: 'doc/refu-game-001/美术/全量出图/地图（PNG 预览；矢量源为同目录同名 SVG）',
    note: '含路径、三类塔位、地形、入口基地、图例与波次卡组标注。',
  },
  {
    key: 'map-motion',
    title: '地图动态 · 双路并行',
    dir: '全量出图/地图动态/PNG预览',
    ext: 'png',
    tags: ['地图动态', '全量出图'],
    credit: 'doc/refu-game-001/美术/全量出图/地图动态（SVG 源含 SMIL animateMotion 动画）',
    note: '四张双入口图的波次并行帧，带流向箭头、呼吸波与 BOSS 走位标注。',
  },
  {
    key: 'summary',
    title: '汇总图',
    dir: '全量出图/汇总/PNG预览',
    ext: 'png',
    tags: ['汇总图', '全量出图'],
    credit: 'doc/refu-game-001/美术/全量出图/汇总',
    note: '按族群分组的 12 卡汇总等总览图。',
  },
  {
    key: 'style-cases-001',
    title: '美学方案 001 · SVG 案例',
    dir: '美术设定001/SVG案例/PNG预览',
    ext: 'png',
    tags: ['美学方案001', '风格案例'],
    credit: 'doc/refu-game-001/美术/美术设定001/SVG案例（PNG 预览；矢量源为上一级同名 SVG）',
    note: '复古未来基调方案：模块炮塔、孵化巢与幼虫、棱镜哨塔、卡面版式样板、峡谷哨站俯视图、色板与材质条。',
  },
  {
    key: 'style-cases-002',
    title: '美学方案 002 · 千禧透明',
    dir: '美术设定002/SVG案例/PNG预览',
    ext: 'png',
    tags: ['美学方案002', '风格案例'],
    credit: 'doc/refu-game-001/美术/美术设定002/SVG案例（PNG 预览；矢量源为上一级同名 SVG）',
    note: '千禧透明美学平行方案：亚克力工事、凝胶卵膜、晶体棱镜塔、透明玩具壳小工、镭射箔挂件、透明亚克力卡面。',
  },
  {
    key: 'export-2048',
    title: '高清导出 · 2048px',
    dir: '导出/2048',
    ext: 'png',
    tags: ['高清导出'],
    credit: 'doc/refu-game-001/美术/导出/2048',
    note: '可直接用于展示与印刷的 2048px 位图导出。',
  },
]

/**
 * 地图 ID → 中文名查找表。
 *
 * 地图动态的文件名形如 `MAP-ANV-02_双路并行_动画.png`，去掉前缀后只剩
 * 「双路并行 · 动画」——四张图会得到**完全相同的标题**，在画廊里无法区分。
 * 因此从「地图」专辑的文件名建立 ID→名称映射，用作地图动态标题的限定词。
 */
function buildMapNames(): Map<string, string> {
  const names = new Map<string, string>()
  const dir = join(ART, '全量出图/地图')
  if (!existsSync(dir)) return names
  for (const f of readdirSync(dir)) {
    const base = f.replace(/\.(svg|png)$/i, '')
    // MAP-ANV-01_峡谷哨站 → id=MAP-ANV-01, name=峡谷哨站
    const us = base.indexOf('_')
    if (us <= 0) continue
    names.set(base.slice(0, us), base.slice(us + 1).replace(/_/g, ' · '))
  }
  return names
}

const MAP_NAMES = buildMapNames()

/** 从文件名里取出开头的 ID 段（如 MAP-ANV-02） */
function leadingId(file: string): string | null {
  const base = file.replace(/\.(svg|png)$/i, '')
  const us = base.indexOf('_')
  return us > 0 ? base.slice(0, us) : null
}

/** 去掉文件名里的编号前缀与族前缀，留下可读名称 */
function displayName(file: string, stripPrefix?: RegExp): string {
  let name = file.replace(/\.(svg|png)$/i, '')
  if (stripPrefix) name = name.replace(stripPrefix, '')
  // ANV-T01_模块炮塔 → 模块炮塔；MAP-ANV-01_峡谷哨站 → 峡谷哨站
  const us = name.indexOf('_')
  if (us > 0) name = name.slice(us + 1)
  let out = name.replace(/_/g, ' · ').trim()
  // 若该文件带有已知地图 ID，则加地图名限定，避免同名（见 buildMapNames 注释）
  const id = leadingId(file)
  const mapName = id ? MAP_NAMES.get(id) : undefined
  if (mapName && !out.includes(mapName)) out = `${mapName} · ${out}`
  return out
}

function yamlString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function collect(): Entry[] {
  const out: Entry[] = []
  for (const spec of ALBUMS) {
    const dir = join(ART, spec.dir)
    if (!existsSync(dir)) {
      warnings.push(`专辑目录不存在：${spec.dir}`)
      continue
    }
    const files = readdirSync(dir)
      .filter(f => f.toLowerCase().endsWith(`.${spec.ext}`))
      .sort()
    if (files.length === 0) warnings.push(`专辑无素材：${spec.dir}`)

    files.forEach((file, i) => {
      const abs = join(dir, file)
      const relToDoc = relative(DOC, abs).replace(/\\/g, '/')
      out.push({
        album: spec.key,
        albumTitle: spec.title,
        media: 'image',
        src: `/media/${relToDoc}`,
        title: displayName(file, spec.stripPrefix),
        tags: spec.tags,
        credit: spec.credit,
        note: i === 0 ? spec.note : undefined,
        order: i,
      })
    })
  }
  return out
}

function frontmatter(e: Entry): string {
  const lines = ['---']
  lines.push(`title: ${yamlString(e.title)}`)
  lines.push(`album: ${yamlString(e.album)}`)
  lines.push(`albumTitle: ${yamlString(e.albumTitle)}`)
  lines.push(`media: ${yamlString(e.media)}`)
  lines.push(`src: ${yamlString(e.src)}`)
  lines.push(`order: ${e.order}`)
  lines.push(`tags: [${e.tags.map(yamlString).join(', ')}]`)
  lines.push(`credit: ${yamlString(e.credit)}`)
  if (e.note) lines.push(`note: ${yamlString(e.note)}`)
  lines.push('---')
  return lines.join('\n')
}

function slug(s: string): string {
  // 保留中文（文件系统与 URL 均可用），只替换路径分隔与空格
  return s.replace(/[\/\\\s]+/g, '-').replace(/[:：]/g, '')
}

function main() {
  const entries = collect()
  if (entries.length === 0) {
    console.error('✗ 未收集到任何素材，请检查 doc/refu-game-001/美术 路径')
    process.exit(1)
  }

  const written: string[] = []
  if (!check) rmSync(OUT, { recursive: true, force: true })

  const byAlbum = new Map<string, number>()
  for (const e of entries) {
    byAlbum.set(e.album, (byAlbum.get(e.album) ?? 0) + 1)
    const rel = `${e.album}/${String(e.order).padStart(3, '0')}-${slug(e.title)}.md`
    const target = join(OUT, rel)
    const content = `${frontmatter(e)}\n`
    if (check) {
      if (!existsSync(target) || readFileSync(target, 'utf-8') !== content) {
        warnings.push(`条目未同步：${rel}`)
      }
    } else {
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, content, 'utf-8')
      written.push(target)
    }
  }

  console.log(`画廊素材        : ${entries.length} 条`)
  for (const spec of ALBUMS) {
    const n = byAlbum.get(spec.key) ?? 0
    console.log(`  ${spec.title.padEnd(22)} ${String(n).padStart(3)} 条`)
  }
  console.log(check ? `校验模式：未写盘（不一致 ${warnings.length} 项）` : `已生成          : ${written.length} 个文件 → content/gallery/`)

  if (warnings.length) {
    console.log(`\n⚠ 告警 ${warnings.length} 项：`)
    for (const w of warnings.slice(0, 10)) console.log(`  · ${w}`)
  }
  if (check && warnings.length) process.exit(1)
  console.log('\n✓ 完成')
}

main()
